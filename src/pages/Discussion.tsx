import { useState, useEffect } from 'react';
import { MessageSquare, Send, Plus, Search, MessageCircle, X } from 'lucide-react';
import { Button } from '../components/Button';
import { dataService } from '../lib/dataService';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';

interface DiscussionPost {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author_id: string;
}

export function Discussion() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();

  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    setLoading(true);
    const { data, error } = await dataService.getDiscussions();
    if (!error && data) setPosts(data);
    setLoading(false);
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      addToast('Please sign in to post in the community forum.', 'error');
      return;
    }
    if (!newTitle.trim() || !newContent.trim()) {
      addToast('Please enter both a title and topic description.', 'info');
      return;
    }

    setIsSubmitting(true);
    const { error } = await dataService.addDiscussion({
      title: newTitle.trim(),
      content: newContent.trim(),
      author_id: user.id,
    });

    setIsSubmitting(false);

    if (!error) {
      setNewTitle('');
      setNewContent('');
      setShowModal(false);
      addToast('Discussion posted to community board! (+5 XP)', 'success');
      fetchPosts();
    } else {
      addToast('Failed to publish post: ' + error, 'error');
    }
  }

  const filteredPosts = posts.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-fade-in pb-12 max-w-5xl mx-auto">
      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-7 rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] via-[var(--surface)] to-[var(--surface-hover)] shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <MessageSquare size={14} />
            <span>Peer Learning Forum</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] font-[var(--font-heading)] tracking-tight">
            Community Discussions
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-xl">
            Ask homework doubts, share code blueprints, discuss exam questions, and collaborate with peers.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setShowModal(true)}
          icon={<Plus size={16} />}
          className="shadow-sm"
        >
          New Topic
        </Button>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search discussions by keyword, topic, or question..."
          className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-xs sm:text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] shadow-xs"
        />
      </div>

      {/* POSTS LIST */}
      <div className="space-y-3.5">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-3 animate-pulse h-32"
            />
          ))
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-[var(--border)] rounded-3xl bg-[var(--surface)] space-y-3">
            <MessageCircle size={44} className="mx-auto text-[var(--text-muted)] opacity-40" />
            <h3 className="text-base font-bold text-[var(--text-main)]">No discussions found</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              {searchQuery
                ? `No posts matched "${searchQuery}". Try a different keyword.`
                : 'Start the very first conversation on this board!'}
            </p>
            <Button size="sm" variant="primary" onClick={() => setShowModal(true)} icon={<Plus size={14} />}>
              Start First Discussion
            </Button>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const authorInitial = post.author_id ? post.author_id.substring(0, 2).toUpperCase() : 'ST';

            return (
              <div
                key={post.id}
                className="p-5 sm:p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] transition-all duration-200 shadow-xs space-y-3 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {authorInitial}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] line-clamp-3 leading-relaxed whitespace-pre-wrap">
                        {post.content}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] text-[11px] text-[var(--text-muted)]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--text-main)]">Peer Member</span>
                    <span>•</span>
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>

                  <span className="text-[var(--primary)] font-semibold flex items-center gap-1 group-hover:underline">
                    <MessageCircle size={13} />
                    <span>Join Discussion</span>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* NEW DISCUSSION MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-[var(--primary)]" />
                <h3 className="font-bold text-base text-[var(--text-main)]">Start a New Discussion</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePost} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Topic Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. How to deploy Next.js with Supabase?"
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Question or Description *
                </label>
                <textarea
                  rows={5}
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Detail your question, share code snippets, or explain what you are trying to solve..."
                  className="input text-sm resize-y"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <Button variant="ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting} icon={<Send size={14} />}>
                  {isSubmitting ? 'Posting...' : 'Publish Topic'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
