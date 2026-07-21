import { useState, useEffect } from 'react';
import { Card, CardBody } from '../components/Card';
import { Button } from '../components/Button';
import { MessageCircle, Send, PlusCircle, Globe } from 'lucide-react';
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
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [showForm, setShowForm] = useState(false);
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    const { data, error } = await dataService.getDiscussions();
    if (!error && data) setPosts(data);
    setLoading(false);
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      addToast('You must be signed in to post.', 'error');
      return;
    }
    if (!newTitle.trim() || !newContent.trim()) {
      addToast('Please enter both title and content.', 'error');
      return;
    }

    const { error } = await dataService.addDiscussion({
      title: newTitle,
      content: newContent,
      author_id: user.id
    });

    if (!error) {
      setNewTitle('');
      setNewContent('');
      setShowForm(false);
      addToast('Discussion post published successfully!', 'success');
      fetchPosts();
    } else {
      addToast('Error posting discussion: ' + error, 'error');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>Community Board</h1>
          <p className="text-muted" style={{ fontSize: '1rem' }}>Share code, ask preparation queries, or organize study sessions.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2">
          <PlusCircle size={16} /> {showForm ? 'Cancel Post' : 'New Discussion'}
        </Button>
      </div>

      {showForm && (
        <Card className="glass-panel" style={{ border: '1px solid var(--glass-border)' }}>
          <CardBody>
            <form onSubmit={handlePost} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Topic Title</label>
                <input 
                  type="text" 
                  placeholder="What is your topic?" 
                  className="input" 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description / Content</label>
                <textarea 
                  placeholder="Describe your issue or question..." 
                  className="input min-h-[120px] resize-y"
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" className="flex items-center gap-2">
                  <Send size={14} /> Publish Post
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {loading ? (
          // SKELETON LISTING
          <div className="flex flex-col gap-4">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardBody className="flex flex-col gap-2">
                  <div className="skeleton" style={{ height: '20px', width: '250px', borderRadius: '4px' }} />
                  <div className="skeleton" style={{ height: '14px', width: '100%', borderRadius: '4px' }} />
                </CardBody>
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card glass style={{ borderStyle: 'dashed', borderColor: 'var(--border)' }}>
            <CardBody className="text-center flex flex-col items-center justify-center p-8 gap-3">
              <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: '50%', color: 'var(--text-muted)' }}>
                <Globe size={36} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>No conversations yet</h3>
              <p className="text-muted text-sm m-0" style={{ maxWidth: '360px' }}>
                There are no posts on this board. Create a new topic to start the discussion!
              </p>
            </CardBody>
          </Card>
        ) : (
          posts.map((post) => {
            const initials = post.author_id.substring(0, 2).toUpperCase();
            return (
              <Card key={post.id} glass style={{ overflow: 'hidden' }}>
                <CardBody className="flex gap-4" style={{ padding: '1.25rem 1.5rem' }}>
                  {/* Avatar column */}
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: 'var(--surface-hover)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--primary)',
                    flexShrink: 0
                  }}>
                    {initials}
                  </div>
                  
                  {/* Content column */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>{post.title}</h3>
                      <span className="text-muted text-xs">
                        {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-muted text-sm m-0 mt-2" style={{ lineHeight: '1.6', wordBreak: 'break-word' }}>{post.content}</p>
                    
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                      <button 
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: 'var(--primary)', 
                          fontSize: '0.8rem', 
                          fontWeight: 600, 
                          cursor: 'pointer',
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.25rem' 
                        }}
                        className="hover:underline"
                      >
                        <MessageCircle size={14} /> Reply
                      </button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
