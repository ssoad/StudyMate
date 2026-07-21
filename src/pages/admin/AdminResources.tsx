import { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody } from '../../components/Card';
import { Button } from '../../components/Button';
import { FileText, Link as LinkIcon, Check, X, Loader2, Download } from 'lucide-react';
import { dataService, type StudyResource } from '../../lib/dataService';
import { useToastStore } from '../../store/toastStore';

export function AdminResources() {
  const { addToast } = useToastStore();
  const [resources, setResources] = useState<StudyResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingResources();
  }, []);

  const loadPendingResources = async () => {
    setLoading(true);
    const { data, error } = await dataService.getPendingResources();
    if (!error && data) {
      setResources(data as unknown as StudyResource[]);
    }
    setLoading(false);
  };

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await dataService.updateResourceStatus(id, status);
    if (error) {
      addToast(`Failed to ${status} resource.`, 'error');
    } else {
      addToast(`Resource ${status} successfully.`, 'success');
      // Remove from list
      setResources(resources.filter(r => r.id !== id));
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-[var(--surface)] to-[var(--surface-hover)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-main)' }}>
            Review Resources
          </h1>
          <p className="text-[var(--text-muted)]" style={{ fontSize: '1rem' }}>
            Approve or reject community-submitted study resources.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="animate-spin text-[var(--primary)]" size={32} />
        </div>
      ) : resources.length === 0 ? (
        <Card className="text-center py-12">
          <CardBody className="flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--surface-hover)] flex items-center justify-center text-[var(--text-muted)]">
              <Check size={32} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-[var(--text-main)]">All Caught Up!</h3>
              <p className="text-[var(--text-muted)] mt-1">There are no pending resources to review.</p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {resources.map((resource) => (
            <Card key={resource.id} className="hover:shadow-md transition-shadow">
              <CardBody className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 rounded-lg flex-shrink-0 mt-1 ${resource.type === 'file' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {resource.type === 'file' ? <FileText size={24} /> : <LinkIcon size={24} />}
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-main)]">
                      {resource.title}
                    </h3>
                    {resource.description && (
                      <p className="text-[var(--text-muted)] text-sm mt-1">
                        {resource.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-xs font-medium px-2 py-1 rounded-md bg-[var(--surface-hover)] text-[var(--text-muted)] border border-[var(--border)] capitalize">
                        Type: {resource.type}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        Submitted by: {resource.uploader?.full_name || resource.uploader?.email}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <a 
                    href={resource.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[var(--surface-hover)] hover:bg-[var(--primary)] hover:text-white transition-colors text-[var(--text-main)] text-sm font-medium border border-[var(--border)]"
                  >
                    {resource.type === 'file' ? <Download size={16} /> : <LinkIcon size={16} />}
                    Preview
                  </a>
                  
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button 
                      variant="secondary" 
                      onClick={() => handleAction(resource.id, 'rejected')}
                      className="flex-1 sm:flex-none text-red-500 hover:bg-red-500/10 border-red-500/20 gap-2"
                    >
                      <X size={16} />
                      Reject
                    </Button>
                    <Button 
                      onClick={() => handleAction(resource.id, 'approved')}
                      className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 text-white gap-2"
                    >
                      <Check size={16} />
                      Approve
                    </Button>
                  </div>
                </div>
                
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
