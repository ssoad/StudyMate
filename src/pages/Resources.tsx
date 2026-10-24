import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Link as LinkIcon, 
  Upload, 
  Download, 
  Eye, 
  X, 
  Search, 
  BookOpen, 
  ExternalLink
} from 'lucide-react';
import { Button } from '../components/Button';
import { dataService, type StudyResource } from '../lib/dataService';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';

export function Resources() {
  const { user, role } = useAuthStore();
  const { addToast } = useToastStore();
  const [resources, setResources] = useState<StudyResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'file' | 'link'>('all');

  // Reader Modal State
  const [readingResource, setReadingResource] = useState<StudyResource | null>(null);

  // Upload Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState<'file' | 'link'>('file');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin =
    role === 'admin' ||
    user?.email === 'admin@studymate.org' ||
    user?.email === 'admin@studymate.local' ||
    (user as any)?.app_metadata?.role === 'admin';

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    setLoading(true);
    const { data, error } = await dataService.getApprovedResources();
    if (!error && data) {
      setResources(data as unknown as StudyResource[]);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (uploadType === 'file' && !selectedFile) {
      addToast('Please select a file to upload.', 'error');
      return;
    }
    if (uploadType === 'link' && !linkUrl) {
      addToast('Please enter a valid URL.', 'error');
      return;
    }

    setSubmitting(true);
    let finalUrl = linkUrl;

    if (uploadType === 'file' && selectedFile) {
      const { url, error } = await dataService.uploadStudyResourceFile(selectedFile);
      if (error || !url) {
        addToast('File upload failed. Defaulting to local preview.', 'info');
        finalUrl = URL.createObjectURL(selectedFile);
      } else {
        finalUrl = url;
      }
    }

    const { error } = await dataService.submitStudyResource({
      title: title.trim(),
      description: description.trim(),
      type: uploadType,
      url: finalUrl,
      uploader_id: user.id,
    });

    if (error) {
      addToast('Failed to submit resource.', 'error');
    } else {
      addToast('Resource submitted successfully! Waiting for admin review.', 'success');
      setIsModalOpen(false);
      resetForm();
      loadResources();
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setLinkUrl('');
    setSelectedFile(null);
    setUploadType('file');
  };

  // Helper to extract clean file name from resource URL or title
  const getDisplayFileName = (res: StudyResource): string => {
    if (/\.[a-z0-9]{2,5}$/i.test(res.title.trim())) {
      return res.title.trim();
    }
    try {
      const urlObj = new URL(res.url, window.location.origin);
      const lastSeg = urlObj.pathname.split('/').pop();
      if (lastSeg && /\.[a-z0-9]{2,5}$/i.test(lastSeg) && !lastSeg.startsWith('blob:')) {
        return decodeURIComponent(lastSeg);
      }
    } catch {}
    const sanitized = res.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${sanitized}.pdf`;
  };

  const filteredResources = resources.filter((res) => {
    const matchesSearch =
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (res.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || res.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-fade-in pb-12 max-w-7xl mx-auto">
      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-7 rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] via-[var(--surface)] to-[var(--surface-hover)] shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <BookOpen size={14} />
            <span>Learning Library</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] font-[var(--font-heading)] tracking-tight">
            Study Resources & Handbooks
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-xl">
            Read chapter notes, architectural blueprints, cheat sheets, and textbooks directly in our interactive reader.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsModalOpen(true)}
          icon={<Upload size={16} />}
          className="shadow-sm"
        >
          Upload Resource
        </Button>
      </div>

      {/* FILTER & SEARCH */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--surface)] p-3.5 rounded-2xl border border-[var(--border)] shadow-xs">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search resources by title, topic, or keyword..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] text-xs sm:text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              typeFilter === 'all'
                ? 'bg-[var(--primary)] text-white shadow-xs'
                : 'bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            All ({resources.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('file')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              typeFilter === 'file'
                ? 'bg-[var(--primary)] text-white shadow-xs'
                : 'bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            PDF & Books ({resources.filter((r) => r.type === 'file').length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('link')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              typeFilter === 'link'
                ? 'bg-[var(--primary)] text-white shadow-xs'
                : 'bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Links ({resources.filter((r) => r.type === 'link').length})
          </button>
        </div>
      </div>

      {/* RESOURCES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] space-y-4 animate-pulse h-52"
            />
          ))
        ) : filteredResources.length === 0 ? (
          <div className="col-span-full text-center py-16 border-2 border-dashed border-[var(--border)] rounded-3xl bg-[var(--surface)] space-y-3">
            <BookOpen size={44} className="mx-auto text-[var(--text-muted)] opacity-40" />
            <h3 className="text-base font-bold text-[var(--text-main)]">No resources found</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              {searchQuery
                ? `No resources matched "${searchQuery}". Try clearing search.`
                : 'Be the first to upload a study guide or cheatsheet!'}
            </p>
            <Button size="sm" variant="primary" onClick={() => setIsModalOpen(true)} icon={<Upload size={14} />}>
              Upload Resource
            </Button>
          </div>
        ) : (
          filteredResources.map((res) => {
            const isFile = res.type === 'file';
            const authorInitial = res.uploader?.full_name?.charAt(0) || res.uploader?.email?.charAt(0) || 'U';

            return (
              <div
                key={res.id}
                className="p-5 sm:p-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] transition-all duration-200 hover:shadow-lg flex flex-col justify-between gap-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        isFile
                          ? 'bg-indigo-500/10 text-indigo-500'
                          : 'bg-emerald-500/10 text-emerald-500'
                      }`}
                    >
                      {isFile ? <FileText size={20} /> : <LinkIcon size={20} />}
                    </div>

                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--surface-hover)] text-[var(--text-muted)] border border-[var(--border)]">
                      {res.type === 'file' ? 'PDF Book' : 'External'}
                    </span>
                  </div>

                  <div>
                    <h3
                      className="text-base font-bold text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors line-clamp-2"
                      title={res.title}
                    >
                      {res.title}
                    </h3>
                    {isFile && (
                      <span className="text-[10px] font-mono text-[var(--text-muted)] block mt-0.5 truncate">
                        {getDisplayFileName(res)}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                    {res.description || 'Verified study resource for class revision.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-6 h-6 rounded-full bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center text-[10px] font-bold text-[var(--text-main)] shrink-0">
                      {authorInitial}
                    </div>
                    <span className="text-xs text-[var(--text-muted)] truncate max-w-[100px]">
                      {res.uploader?.full_name || res.uploader?.email?.split('@')[0] || 'Community'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isFile ? (
                      <button
                        type="button"
                        onClick={() => setReadingResource(res)}
                        className="btn btn-primary text-xs py-1 px-3 rounded-xl flex items-center gap-1 shadow-xs"
                        title="Read online in secure viewer"
                      >
                        <Eye size={13} />
                        <span>Read</span>
                      </button>
                    ) : (
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary text-xs py-1 px-3 rounded-xl flex items-center gap-1"
                      >
                        <span>Open</span>
                        <ExternalLink size={12} />
                      </a>
                    )}

                    {isAdmin && isFile && (
                      <a
                        href={res.url}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-colors"
                        title="Download File (Admin Only)"
                      >
                        <Download size={13} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* IN-BROWSER INTERACTIVE DOCUMENT READER MODAL */}
      {readingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-5xl bg-[var(--surface)] border border-[var(--border)] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[96vh] sm:max-h-[92vh]">
            <div className="p-3 sm:p-4 border-b border-[var(--border)] flex items-center justify-between gap-3 bg-[var(--surface-hover)]/70">
              <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                  <FileText size={16} />
                </div>
                <div className="overflow-hidden">
                  <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)] truncate max-w-[160px] sm:max-w-md">
                    {readingResource.title}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-[var(--text-muted)] truncate flex items-center gap-1.5">
                    <span className="uppercase font-semibold">PDF Document</span>
                    <span>•</span>
                    <span className="text-emerald-500 font-medium">Interactive Online Reader</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isAdmin && (
                  <a
                    href={readingResource.url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary text-xs h-7 sm:h-8 px-2 sm:px-3 flex items-center gap-1 shadow-sm"
                    title="Download File (Admin Only)"
                  >
                    <Download size={13} />
                    <span className="hidden sm:inline">Download</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setReadingResource(null)}
                  className="p-1 sm:p-1.5 rounded-full hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                  title="Close Reader"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 p-2 sm:p-4 bg-gray-950 overflow-hidden flex items-center justify-center">
              <iframe
                src={`${readingResource.url}#toolbar=0`}
                title={readingResource.title}
                className="w-full h-[75vh] border-0 rounded-2xl bg-white shadow-inner"
              />
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Upload size={18} className="text-[var(--primary)]" />
                <h3 className="font-bold text-base text-[var(--text-main)]">Upload Study Resource</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type selector */}
              <div className="flex p-1 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setUploadType('file')}
                  className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    uploadType === 'file'
                      ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  <FileText size={14} /> PDF / Document
                </button>
                <button
                  type="button"
                  onClick={() => setUploadType('link')}
                  className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    uploadType === 'link'
                      ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  <LinkIcon size={14} /> Web Link
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Resource Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Organic Chemistry Lecture Notes (PDF)"
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Brief Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize key topics, formulas, or chapters included..."
                  className="input text-sm resize-none"
                />
              </div>

              {uploadType === 'file' ? (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    Select File (PDF or Book) *
                  </label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="input text-xs"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    External URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="input text-sm"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={submitting} icon={<Upload size={14} />}>
                  {submitting ? 'Uploading...' : 'Submit Resource'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
