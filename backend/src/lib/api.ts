// lib/api.ts
import { supabase, type Database } from './supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/* -------------------- Auth / profile -------------------- */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session ?? null;
}

export async function getProfile() {
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  if (error) throw error;
  return data;
}

/* -------------------- Assets -------------------- */
type AssetRow = Database['public']['Tables']['assets']['Row'];

export async function createAsset(
  input: Omit<Database['public']['Tables']['assets']['Insert'], 'owner_id'>,
) {
  const session = await getSession();
  if (!session) throw new Error('Not authenticated');
  const insert = { ...input, owner_id: session.user.id };
  const { data, error } = await supabase.from('assets').insert(insert).select('*').single();
  if (error) throw error;
  return data as AssetRow;
}

/* -------------------- Posts & Feed -------------------- */
export type FeedItem = {
  post: Database['public']['Tables']['v_posts_with_counts']['Row'];
  asset: Pick<AssetRow, 'id' | 'original_url' | 'media_kind'>;
};

export async function listFeed(limit = 20, before?: string) {
  // 1) get posts with counts
  let q = supabase.from('v_posts_with_counts').select('*').order('created_at', { ascending: false }).limit(limit);
  if (before) q = q.lt('created_at', before);
  const { data: posts, error } = await q;
  if (error) throw error;

  // 2) fetch assets for those posts
  const assetIds = Array.from(new Set(posts.map(p => p.asset_id)));
  const { data: assets, error: aerr } = await supabase.from('assets')
    .select('id, original_url, media_kind')
    .in('id', assetIds);
  if (aerr) throw aerr;

  const assetMap = new Map(assets.map(a => [a.id, a]));
  return posts.map(p => ({
    post: p,
    asset: assetMap.get(p.asset_id)!,
  })) as FeedItem[];
}

export async function createPostFromAsset(assetId: number, caption?: string | null) {
  const { data, error } = await supabase.rpc('create_post', { p_asset_id: assetId, p_caption: caption ?? null });
  if (error) throw error;
  return data;
}

export async function deletePost(postId: number) {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;
}

/* -------------------- Likes -------------------- */
export async function toggleLike(postId: number) {
  const { data, error } = await supabase.rpc('toggle_like', { p_post_id: postId });
  if (error) throw error;
  return data?.[0] ?? { liked: false, likes_count: 0 };
}

/* -------------------- Comments -------------------- */
export async function listComments(postId: number) {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data!;
}

export async function addComment(postId: number, text: string) {
  const session = await getSession();
  if (!session) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, author_id: session.user.id, text })
    .select('*')
    .single();
  if (error) throw error;
  return data!;
}

/* -------------------- Jobs (render queue) -------------------- */
export async function createJob(input: Omit<Database['public']['Tables']['jobs']['Insert'], 'requester_id' | 'state' | 'progress'>) {
  const session = await getSession();
  if (!session) throw new Error('Not authenticated');
  const payload = { requester_id: session.user.id, ...input };
  const { data, error } = await supabase.from('jobs').insert(payload).select('*').single();
  if (error) throw error;
  return data!;
}

export async function getJob(id: number) {
  const { data, error } = await supabase.from('jobs').select('*').eq('id', id).single();
  if (error) throw error;
  return data!;
}

/* ==================== React Query Hooks ==================== */

/** Feed with simple key-based pagination (pass last.created_at to `before`) */
export function useFeed(limit = 20, before?: string) {
  return useQuery({
    queryKey: ['feed', limit, before],
    queryFn: () => listFeed(limit, before),
  });
}

export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: number) => toggleLike(postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useComments(postId: number) {
  return useQuery({
    queryKey: ['comments', postId],
    queryFn: () => listComments(postId),
    enabled: !!postId,
  });
}

export function useAddComment(postId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => addComment(postId, text),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', postId] }),
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, caption }: { assetId: number; caption?: string | null }) =>
      createPostFromAsset(assetId, caption),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });
}

/** Poll a job by id every `intervalMs` until completed/failed */
export function useJobPolling(jobId?: number, intervalMs = 1500) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: () => getJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (q) => {
      const s = q.state.data as Database['public']['Tables']['jobs']['Row'] | undefined;
      if (!s) return intervalMs;
      return (s.state === 'completed' || s.state === 'failed') ? false : intervalMs;
    },
  });
}
