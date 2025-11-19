import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import toast from 'react-hot-toast';

interface User {
  id: string;
  username: string;
  receipt_id?: string;
  is_banned: boolean;
  is_muted: boolean;
  message_count: number;
  last_seen_at: Date;
}

const Users: React.FC = () => {
  const { cafe } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBanned, setFilterBanned] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [muteDuration, setMuteDuration] = useState(60);
  const [muteReason, setMuteReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [cafe, searchTerm, filterBanned]);

  const fetchUsers = async () => {
    if (!cafe?.id) return;

    setIsLoading(true);
    try {
      const response = await apiClient.get(`/cafes/${cafe.id}/users`, {
        params: {
          search: searchTerm || undefined,
          banned: filterBanned ? 'true' : undefined,
        },
      });
      setUsers(response.data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMute = async () => {
    if (!selectedUser) return;

    try {
      await apiClient.post('/moderation/mute', {
        userId: selectedUser.id,
        duration: muteDuration,
        reason: muteReason,
      });

      toast.success(`User ${selectedUser.username} muted for ${muteDuration} minutes`);
      setShowMuteModal(false);
      setSelectedUser(null);
      setMuteReason('');
      fetchUsers();
    } catch (error) {
      console.error('Failed to mute user:', error);
      toast.error('Failed to mute user');
    }
  };

  const handleUnmute = async (user: User) => {
    try {
      await apiClient.post('/moderation/unmute', {
        userId: user.id,
      });

      toast.success(`User ${user.username} unmuted`);
      fetchUsers();
    } catch (error) {
      console.error('Failed to unmute user:', error);
      toast.error('Failed to unmute user');
    }
  };

  const handleBan = async (user: User) => {
    if (!confirm(`Are you sure you want to ban ${user.username}?`)) return;

    try {
      await apiClient.post('/moderation/ban', {
        userId: user.id,
        reason: 'Banned by moderator',
        permanent: true,
      });

      toast.success(`User ${user.username} banned`);
      fetchUsers();
    } catch (error) {
      console.error('Failed to ban user:', error);
      toast.error('Failed to ban user');
    }
  };

  const handleUnban = async (user: User) => {
    try {
      await apiClient.post('/moderation/unban', {
        userId: user.id,
      });

      toast.success(`User ${user.username} unbanned`);
      fetchUsers();
    } catch (error) {
      console.error('Failed to unban user:', error);
      toast.error('Failed to unban user');
    }
  };

  return (
    <div className="glass-card rounded-2xl">
      <div className="p-6 border-b border-white/20">
        <h2 className="text-2xl font-bold mb-4 text-white drop-shadow-lg">User Management</h2>

        <div className="flex space-x-4 relative z-10">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glass-input flex-1 px-4 py-2 rounded-xl text-white placeholder-white/50 font-medium"
          />
          <label className="flex items-center space-x-2 glass-light px-4 py-2 rounded-xl text-white font-medium">
            <input
              type="checkbox"
              checked={filterBanned}
              onChange={(e) => setFilterBanned(e.target.checked)}
              className="rounded"
            />
            <span>Banned only</span>
          </label>
          <button
            onClick={fetchUsers}
            className="glass-btn-primary px-4 py-2 rounded-xl text-white font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-white/70 text-lg">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/70 text-lg">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto relative z-10">
            <table className="min-w-full">
              <thead className="glass-light">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Receipt ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Messages
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Last Seen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-white">{user.username}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white/70 font-mono">{user.receipt_id || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white font-medium">{user.message_count || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        {user.is_banned && (
                          <span className="px-3 py-1 text-xs bg-red-400/30 text-red-100 rounded-full font-semibold border border-red-300/30">
                            Banned
                          </span>
                        )}
                        {user.is_muted && (
                          <span className="px-3 py-1 text-xs bg-yellow-400/30 text-yellow-100 rounded-full font-semibold border border-yellow-300/30">
                            Muted
                          </span>
                        )}
                        {!user.is_banned && !user.is_muted && (
                          <span className="px-3 py-1 text-xs bg-green-400/30 text-green-100 rounded-full font-semibold border border-green-300/30">
                            Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                      {new Date(user.last_seen_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {user.is_muted ? (
                        <button
                          onClick={() => handleUnmute(user)}
                          className="text-green-300 hover:text-green-100 font-semibold"
                        >
                          Unmute
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowMuteModal(true);
                          }}
                          className="text-yellow-300 hover:text-yellow-100 font-semibold"
                        >
                          Mute
                        </button>
                      )}
                      {user.is_banned ? (
                        <button
                          onClick={() => handleUnban(user)}
                          className="text-green-300 hover:text-green-100 font-semibold"
                        >
                          Unban
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBan(user)}
                          className="text-red-300 hover:text-red-100 font-semibold"
                        >
                          Ban
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mute Modal */}
      {showMuteModal && selectedUser && (
        <div className="glass-modal-backdrop fixed inset-0 flex items-center justify-center z-50 animate-fade-in">
          <div className="glass-modal rounded-2xl p-6 w-full max-w-md animate-glass-enter">
            <h3 className="text-xl font-bold mb-4 text-white drop-shadow">Mute User: {selectedUser.username}</h3>

            <div className="space-y-4 relative z-10">
              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={muteDuration}
                  onChange={(e) => setMuteDuration(Number(e.target.value))}
                  min={1}
                  className="glass-input w-full px-4 py-2 rounded-xl text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Reason (optional)
                </label>
                <textarea
                  value={muteReason}
                  onChange={(e) => setMuteReason(e.target.value)}
                  className="glass-input w-full px-4 py-2 rounded-xl text-white font-medium"
                  rows={3}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleMute}
                  className="glass-btn-primary flex-1 px-4 py-2 rounded-xl text-white font-semibold"
                  style={{ background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.9), rgba(202, 138, 4, 0.9))' }}
                >
                  Mute User
                </button>
                <button
                  onClick={() => {
                    setShowMuteModal(false);
                    setSelectedUser(null);
                    setMuteReason('');
                  }}
                  className="glass-btn-secondary flex-1 px-4 py-2 rounded-xl text-white font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
