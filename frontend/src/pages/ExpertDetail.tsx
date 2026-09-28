import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Briefcase, MapPin, Clock, ArrowLeft, Download, FileText, CheckCircle2, Mic, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function ExpertDetail() {
  const { expertId } = useParams<{ expertId: string }>();
  const [expert, setExpert] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    fetch(`http://localhost:8000/api/experts/${expertId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setExpert(data);
        setIsLoading(false);
      })
      .catch(console.error);
  }, [expertId]);

  const startFollowUp = async () => {
    setIsStarting(true);
    setStartError(null);
    try {
      const res = await fetch(`http://localhost:8000/api/experts/${expertId}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          focus_gap_ids: (expert?.open_gaps || []).map((g: any) => g.id)
        })
      });
      const data = await res.json();

      if (res.status === 409) {
        // An interview is already running for this expert; jump straight into it
        navigate(`/capture/${data.detail.session_id}`);
        return;
      }
      if (!res.ok) throw new Error(data.detail || 'Could not start the session');

      navigate(`/capture/${data.session_id}`);
    } catch (err: any) {
      setStartError(err.message || 'Could not start the session');
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!expert) return <div>Expert not found</div>;

  return (
    <div className="h-full flex flex-col max-w-[1600px] mx-auto p-6 overflow-y-auto">
      <Link to="/experts" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 w-fit transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Directory
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-primary/20 to-orange-500/20" />
            
            <div className="w-24 h-24 mx-auto bg-card border-4 border-background rounded-2xl flex items-center justify-center text-4xl font-bold text-primary shadow-xl relative z-10 mb-4 mt-12">
              {expert.name.charAt(0)}
            </div>
            
            <h1 className="text-2xl font-bold mb-1">{expert.name}</h1>
            <p className="text-primary font-medium mb-6">{expert.role}</p>
            
            <div className="space-y-4 text-left">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-semibold">Department</p>
                  <p className="font-medium">{expert.department}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-semibold">Experience</p>
                  <p className="font-medium">{expert.experience}</p>
                </div>
              </div>
            </div>

            {expert.resume_url && (
              <a 
                href={expert.resume_url}
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-8 w-full bg-secondary text-secondary-foreground py-3 rounded-xl font-semibold hover:bg-secondary/80 flex items-center justify-center gap-2 transition-all"
              >
                <FileText className="w-4 h-4" />
                View Source Document
              </a>
            )}
          </div>
          
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold mb-4 text-sm flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              Core Expertise
            </h3>
            <div className="flex flex-wrap gap-2">
              {expert.expertise.split(',').map((skill: string, i: number) => (
                <span key={i} className="bg-primary/10 text-primary border border-primary/20 text-xs px-3 py-1.5 rounded-lg font-medium">
                  {skill.trim()}
                </span>
              ))}
            </div>
          </div>

          {expert.projects && expert.projects.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold mb-4 text-sm flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                Extracted Projects
              </h3>
              <div className="space-y-4">
                {expert.projects.map((project: any, i: number) => (
                  <div key={i} className="border-l-2 border-primary/30 pl-4">
                    <h4 className="font-bold text-sm">{project.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                    {project.tech_stack && project.tech_stack.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {project.tech_stack.map((tech: string, j: number) => (
                          <span key={j} className="text-[10px] bg-secondary text-secondary-foreground px-2 py-1 rounded font-semibold uppercase tracking-wider">
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Sessions & Assets */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Sessions */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Mic className="w-5 h-5 text-primary" />
                Knowledge Sessions
              </h2>
              <button 
                onClick={startFollowUp}
                disabled={isStarting}
                className="text-sm font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {isStarting && <Loader2 className="w-4 h-4 animate-spin" />}
                {expert.has_active_session
                  ? 'Resume Interview →'
                  : expert.sessions.length > 0
                    ? 'Start Follow-up Interview →'
                    : 'Start Interview →'}
              </button>
            </div>

            {startError && (
              <div className="mb-4 text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-3">
                {startError}
              </div>
            )}
            
            <div className="space-y-4">
              {expert.sessions.length === 0 ? (
                <div className="p-8 border border-dashed border-border rounded-2xl text-center text-muted-foreground">
                  No sessions recorded yet.
                </div>
              ) : (
                expert.sessions.map((session: any) => (
                  <div key={session.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors flex items-center justify-between cursor-pointer" onClick={() => navigate(`/capture/${session.id}`)}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${session.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'}`}>
                        {session.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          {session.domain}
                          {session.parent_session_id && (
                            <span className="text-[10px] uppercase tracking-wider font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                              Follow-up
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(session.created_at).toLocaleDateString()} • {session.coverage.toFixed(1)}% Coverage
                        </p>
                      </div>
                    </div>
                    <div className="text-xs font-semibold px-3 py-1 rounded-full bg-secondary uppercase tracking-wider">
                      {session.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Open Knowledge Gaps */}
          {expert.open_gaps && expert.open_gaps.length > 0 && (
            <section>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                <AlertCircle className="w-5 h-5 text-destructive" />
                Unresolved Knowledge Gaps
                <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-semibold">
                  {expert.open_gaps.length}
                </span>
              </h2>
              <p className="text-sm text-muted-foreground -mt-3 mb-4">
                A follow-up interview will open directly on these instead of repeating covered ground.
              </p>
              <div className="space-y-3">
                {expert.open_gaps.map((gap: any) => (
                  <div key={gap.id} className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-destructive/80 mb-1">
                          {gap.category}
                          {gap.assigned && <span className="ml-2 text-muted-foreground">• assigned to a session</span>}
                        </div>
                        <p className="text-sm break-words">{gap.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Generated Assets */}
          <section>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
              <FileText className="w-5 h-5 text-primary" />
              Preserved Knowledge Assets
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {expert.assets.length === 0 ? (
                <div className="col-span-full p-8 border border-dashed border-border rounded-2xl text-center text-muted-foreground">
                  Complete a session to generate assets.
                </div>
              ) : (
                expert.assets.map((asset: any) => (
                  <Link key={asset.id} to="/assets" className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-1">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold line-clamp-2 leading-tight">{asset.title}</h4>
                        <p className="text-[10px] uppercase font-bold text-primary tracking-wider mt-2">{asset.type}</p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
          
        </div>
      </div>
    </div>
  );
}
