import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, MapPin, Fish, Weight, Ruler } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import CommentSection from '@/components/CommentSection';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

const PostDetailPage = () => {
  const { postId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*, user:users(*), likes(count), comments(count)')
          .eq('id', postId)
          .single();

        if (error) throw error;
        setPost(data);
        setLikesCount(data.likes_count || 0);
      } catch (error) {
        console.error('Error fetching post:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  useEffect(() => {
    if (!user?.id || !post?.id) return;

    const checkLiked = async () => {
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();
      setLiked(!!data);
    };

    checkLiked();
  }, [user?.id, post?.id, postId]);

  const handleLike = async () => {
    if (!user) return;
    const prevLiked = liked;
    const prevCount = likesCount;

    setLiked(!liked);
    setLikesCount(prev => liked ? prev - 1 : prev + 1);

    try {
      if (liked) {
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
      } else {
        await supabase.from('likes').insert([{ post_id: postId, user_id: user.id }]);
        
        if (post.user_id !== user.id) {
           await supabase.from('notifications').insert([{
              user_id: post.user_id,
              type: 'like',
              related_user_id: user.id,
              post_id: postId,
              read: false
           }]);
        }
      }
    } catch (error) {
      setLiked(prevLiked);
      setLikesCount(prevCount);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link Copied!",
      description: "Post link copied to clipboard",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 pt-20 flex justify-center">
         <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-950 pt-20 text-center text-white">
        <h2 className="text-2xl font-bold">Post not found</h2>
        <Link to="/feed" className="text-cyan-400 hover:underline mt-4 inline-block">Return to Feed</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-950 to-slate-900 pb-20">
      <div className="max-w-4xl mx-auto pt-8 px-4">
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-900/20 backdrop-blur-md border border-blue-800/50 rounded-2xl overflow-hidden shadow-xl"
        >
          {/* Media */}
          <div className="bg-black/80 aspect-video flex items-center justify-center">
            {post.video_url ? (
               <video src={post.video_url} controls className="max-h-[600px] w-full" />
            ) : (
               <img src={post.foto_url} alt="Catch" className="max-h-[600px] w-full object-contain" />
            )}
          </div>

          <div className="p-6 md:p-8">
             {/* Header */}
             <div className="flex items-center justify-between mb-6">
                <Link to={`/profile/${post.user_id}`} className="flex items-center gap-4 group">
                    <Avatar className="w-12 h-12 border-2 border-cyan-500/50 group-hover:border-cyan-400 transition-colors">
                        <AvatarImage src={post.user?.foto_perfil} />
                        <AvatarFallback>{post.user?.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">{post.user?.username}</h2>
                        <p className="text-sm text-blue-300">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
                    </div>
                </Link>
                <div className="flex gap-2">
                   {/* Share Button */}
                   <Button variant="ghost" size="icon" onClick={handleShare} className="text-blue-300 hover:text-white hover:bg-blue-800/50">
                      <Share2 className="w-5 h-5" />
                   </Button>
                </div>
             </div>

             {/* Stats Bar */}
             <div className="flex flex-wrap gap-4 mb-6 bg-blue-950/50 p-4 rounded-xl border border-blue-800/30">
                {post.tipo_pez && (
                    <div className="flex items-center gap-2 text-blue-200">
                        <Fish className="w-5 h-5 text-cyan-400" /> 
                        <span className="font-medium">{post.tipo_pez}</span>
                    </div>
                )}
                {post.peso && (
                    <div className="flex items-center gap-2 text-blue-200">
                        <Weight className="w-5 h-5 text-cyan-400" />
                        <span>{post.peso} kg</span>
                    </div>
                )}
                {post.tamano && (
                    <div className="flex items-center gap-2 text-blue-200">
                        <Ruler className="w-5 h-5 text-cyan-400" />
                        <span>{post.tamano} cm</span>
                    </div>
                )}
                {post.ubicacion && (
                    <div className="flex items-center gap-2 text-blue-200">
                        <MapPin className="w-5 h-5 text-cyan-400" />
                        <span>{post.ubicacion}</span>
                    </div>
                )}
             </div>

             {/* Content */}
             {post.descripcion && (
                 <p className="text-lg text-blue-50 leading-relaxed mb-8">{post.descripcion}</p>
             )}

             {/* Actions */}
             <div className="flex items-center gap-6 pt-6 border-t border-blue-800/50">
                <button 
                    onClick={handleLike}
                    className={`flex items-center gap-2 text-lg font-medium transition-colors ${liked ? 'text-red-500' : 'text-blue-300 hover:text-white'}`}
                >
                    <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
                    {likesCount} Likes
                </button>
                <div className="flex items-center gap-2 text-lg font-medium text-blue-300">
                    <MessageCircle className="w-6 h-6" />
                    {post.comments_count} Comments
                </div>
             </div>
             
             {/* Comments Section */}
             <CommentSection postId={postId} postOwnerId={post.user_id} />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PostDetailPage;