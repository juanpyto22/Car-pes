import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const UserCard = ({ user, isFollowing, onFollowToggle, loading }) => {
  return (
    <Link to={`/profile/${user.id}`}>
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        className="bg-blue-900/20 backdrop-blur-md border border-blue-800/50 rounded-xl p-4 shadow-lg hover:shadow-xl hover:border-cyan-500/30 transition-all cursor-pointer h-full flex flex-col items-center text-center"
      >
        <Avatar className="w-16 h-16 mb-3 border-2 border-cyan-500/50">
          <AvatarImage src={user.foto_perfil} />
          <AvatarFallback className="bg-blue-800 text-blue-200">
            {user.username?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <h3 className="font-bold text-white mb-1">{user.username}</h3>
        
        {user.bio && (
          <p className="text-sm text-blue-200 line-clamp-2 mb-4 h-10">
            {user.bio}
          </p>
        )}

        <div className="mt-auto w-full flex items-center justify-between gap-2">
          <span className="text-xs text-blue-300 bg-blue-950/50 px-2 py-1 rounded-full">
            {user.followers_count || 0} Followers
          </span>
          
          <Button
            size="sm"
            disabled={loading}
            onClick={(e) => {
              e.preventDefault();
              onFollowToggle(user.id);
            }}
            variant={isFollowing ? "secondary" : "default"}
            className={`text-xs h-8 px-3 ${
              isFollowing 
                ? 'bg-blue-800 hover:bg-blue-700 text-blue-200' 
                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
            }`}
          >
            {loading ? '...' : (isFollowing ? 'Following' : 'Follow')}
          </Button>
        </div>
      </motion.div>
    </Link>
  );
};

export default UserCard;