import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Button } from '../components/Button';
import { FileText, Link as LinkIcon, Upload, Download, X, Loader2 } from 'lucide-react';
import { dataService, type StudyResource } from '../lib/dataService';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';

export function Resources() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [resources, setResources] = useState<StudyResource[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState<'file' | 'link'>('file');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        addToast('File upload failed.', 'error');
        setSubmitting(false);
        return;
      }
      finalUrl = url;
    }
    
    const { error } = await dataService.submitStudyResource({
      title,
      description,
      type: uploadType,
      url: finalUrl,
      uploader_id: user.id
    });
    
    if (error) {
      addToast('Failed to submit resource.', 'error');
    } else {
      addToast('Resource submitted successfully! Waiting for admin approval.', 'success');
      setIsModalOpen(false);
      resetForm();
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

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-[var(--surface)] to-[var(--surface-hover)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-main)' }}>
            Community Resources
          </h1>
          <p className="text-[var(--text-muted)]" style={{ fontSize: '1rem' }}>
            Discover and share study materials, notes, and helpful links.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-md hover:shadow-lg transition-all px-6 py-2.5 bg-gradient-to-r from-[var(--primary)] to-indigo-600 rounded-xl">
          <Upload size={18} />
          <span className="font-semibold">Upload Resource</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="animate-spin text-[var(--primary)]" size={32} />
        </div>
      ) : resources.length === 0 ? (
        <Card className="text-center py-12">
          <CardBody className="flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--surface-hover)] flex items-center justify-center text-[var(--text-muted)]">
              <FileText size={32} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-[var(--text-main)]">No resources found</h3>
              <p className="text-[var(--text-muted)] mt-1">Be the first to share a study resource with the community!</p>
            </div>
            <Button onClick={() => setIsModalOpen(true)} variant="secondary" className="mt-2">
              Upload Now
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-2">
          {resources.map((resource) => (
            <Card key={resource.id} className="hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group flex flex-col h-full bg-gradient-to-br from-[var(--surface)] to-[var(--surface-hover)] border-[var(--border)] overflow-hidden">
              <div className={`h-1.5 w-full ${resource.type === 'file' ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`} />
              <CardBody className="flex flex-col h-full p-6">
                <div className="flex items-start justify-between mb-5">
                  <div className={`p-3.5 rounded-xl shadow-sm flex-shrink-0 ${resource.type === 'file' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {resource.type === 'file' ? <FileText size={26} strokeWidth={1.5} /> : <LinkIcon size={26} strokeWidth={1.5} />}
                  </div>
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[var(--surface)] shadow-sm text-[var(--text-muted)] border border-[var(--border)] capitalize tracking-wide">
                    {resource.type}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-[var(--text-main)] mb-3 line-clamp-2 leading-tight group-hover:text-[var(--primary)] transition-colors">
                  {resource.title}
                </h3>
                
                <p className="text-[var(--text-muted)] text-sm mb-6 line-clamp-3 flex-grow leading-relaxed">
                  {resource.description || <span className="italic opacity-50">No description provided.</span>}
                </p>
                
                <div className="flex items-center justify-between mt-auto pt-5 border-t border-[var(--border)]/60">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-indigo-600 text-white flex items-center justify-center text-[11px] font-bold shadow-md ring-2 ring-[var(--surface)]">
                      {resource.uploader?.full_name?.charAt(0) || resource.uploader?.email?.charAt(0) || 'U'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-[var(--text-main)] truncate max-w-[120px]">
                        {resource.uploader?.full_name || resource.uploader?.email?.split('@')[0]}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">Contributor</span>
                    </div>
                  </div>
                  
                  <a 
                    href={resource.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`p-2.5 rounded-xl shadow-sm hover:shadow-md transition-all flex-shrink-0 group-hover:scale-110 ${resource.type === 'file' ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white dark:bg-indigo-500/10 dark:hover:bg-indigo-500' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white dark:bg-emerald-500/10 dark:hover:bg-emerald-500'}`}
                    title={resource.type === 'file' ? 'Download File' : 'Visit Link'}
                  >
                    {resource.type === 'file' ? <Download size={18} strokeWidth={2} /> : <LinkIcon size={18} strokeWidth={2} />}
                  </a>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
              <h2 className="text-xl font-bold text-[var(--text-main)]">Submit Resource</h2>
              <button 
                onClick={() => { setIsModalOpen(false); resetForm(); }}
                className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)] transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Type Selection */}
                <div className="flex p-1 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setUploadType('file')}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
                      uploadType === 'file' 
                        ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm' 
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <FileText size={16} /> File Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadType('link')}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
                      uploadType === 'link' 
                        ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm' 
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <LinkIcon size={16} /> External Link
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-main)] mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
                    placeholder="e.g., Biology Chapter 4 Notes"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-main)] mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all resize-none"
                    placeholder="Briefly describe what this resource contains..."
                  />
                </div>

                {uploadType === 'link' ? (
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-main)] mb-1">URL *</label>
                    <input
                      type="url"
                      required
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
                      placeholder="https://example.com/resource"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-main)] mb-1">File *</label>
                    <div className="relative border-2 border-dashed border-[var(--border)] rounded-xl p-6 text-center hover:border-[var(--primary)] transition-colors group bg-[var(--surface-hover)]/50">
                      <input
                        type="file"
                        required
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="flex flex-col items-center gap-2 pointer-events-none">
                        <div className="w-12 h-12 rounded-full bg-[var(--surface)] flex items-center justify-center text-[var(--primary)] shadow-sm group-hover:scale-110 transition-transform">
                          <Upload size={24} />
                        </div>
                        {selectedFile ? (
                          <div>
                            <p className="text-sm font-medium text-[var(--primary)]">{selectedFile.name}</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-medium text-[var(--text-main)]">Click or drag file to upload</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">Supports Media, PDF, and Documents</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="pt-4 border-t border-[var(--border)] flex justify-end gap-3">
                  <Button type="button" variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="min-w-[120px]">
                    {submitting ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Submit for Review'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
