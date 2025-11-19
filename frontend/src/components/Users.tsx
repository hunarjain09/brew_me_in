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
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <h2 className="text-2xl font-bold mb-4">User Management</h2>

        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border rounded"
          />
          <label className="flex items-center space-x-2">
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
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Receipt ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Messages
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Last Seen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.username}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.receipt_id || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.message_count || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        {user.is_banned && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                            Banned
                          </span>
                        )}
                        {user.is_muted && (
                          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                            Muted
                          </span>
                        )}
                        {!user.is_banned && !user.is_muted && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.last_seen_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {user.is_muted ? (
                        <button
                          onClick={() => handleUnmute(user)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Unmute
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowMuteModal(true);
                          }}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          Mute
                        </button>
                      )}
                      {user.is_banned ? (
                        <button
                          onClick={() => handleUnban(user)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Unban
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBan(user)}
                          className="text-red-600 hover:text-red-900"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Mute User: {selectedUser.username}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={muteDuration}
                  onChange={(e) => setMuteDuration(Number(e.target.value))}
                  min={1}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (optional)
                </label>
                <textarea
                  value={muteReason}
                  onChange={(e) => setMuteReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleMute}
                  className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Mute User
                </button>
                <button
                  onClick={() => {
                    setShowMuteModal(false);
                    setSelectedUser(null);
                    setMuteReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
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
