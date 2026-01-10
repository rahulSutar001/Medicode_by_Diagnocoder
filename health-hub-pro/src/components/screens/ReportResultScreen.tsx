import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { ArrowLeft, MessageCircle, Share2, ChevronDown, ChevronUp, Check, AlertTriangle, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, getStorageUrl } from '@/lib/utils';
import { getReport, getReportParameters } from '@/lib/api';
import { toast } from 'sonner';
import { ReportSynthesis } from '../ReportSynthesis';
import { Chatbot } from '@/components/Chatbot';

interface TestResult {
  name: string;
  value: string;
  range: string;
  flag: 'normal' | 'high' | 'low';
  explanation?: {
    what: string;
    meaning: string;
    causes: string[];
    next_steps: string[];
  };
}

export function ReportResultScreen() {
  const { setCurrentScreen, setActiveTab, currentReportId } = useApp();
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [report, setReport] = useState<any>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'results' | 'analysis'>('results');

  const handleBack = () => {
    setActiveTab('history');
    setCurrentScreen('history');
  };

  const getFlagIcon = (flag: string) => {
    switch (flag) {
      case 'high':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'low':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      default:
        return <Check className="w-4 h-4 text-success" />;
    }
  };

  useEffect(() => {
    const loadReport = async () => {
      if (!currentReportId) {
        toast.error('No report ID found');
        setCurrentScreen('history');
        return;
      }

      try {
        setLoading(true);
        const reportData = await getReport(currentReportId);
        const parameters = await getReportParameters(currentReportId);

        setReport(reportData);

        // Transform parameters to TestResult format
        const transformedResults: TestResult[] = parameters.map((param: any) => ({
          name: param.name,
          value: `${param.value}${param.unit ? ` ${param.unit}` : ''}`,
          range: param.normal_range || 'N/A',
          flag: param.flag,
          explanation: param.report_explanations?.[0] ? {
            what: param.report_explanations[0].what,
            meaning: param.report_explanations[0].meaning,
            causes: param.report_explanations[0].causes || [],
            next_steps: param.report_explanations[0].next_steps || [],
          } : undefined,
        }));

        setResults(transformedResults);
      } catch (error: any) {
        console.error('Failed to load report:', error);
        toast.error('Failed to load report. Please try again.');
        setCurrentScreen('history');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [currentReportId, setCurrentScreen]);

  const getFlagColor = (flag: string) => {
    switch (flag) {
      case 'high':
        return 'bg-destructive';
      case 'low':
        return 'bg-warning';
      default:
        return 'bg-success';
    }
  };

  const overallStatus = results.some(r => r.flag === 'high' || r.flag === 'low') ? 'warning' : 'normal';

  if (loading) {
    return (
      <div className="absolute inset-0 bg-background flex items-center justify-center">
        <p className="text-body text-text-secondary">Loading report...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="absolute inset-0 bg-background flex items-center justify-center">
        <p className="text-body text-text-secondary">No report data found</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-background overflow-hidden flex flex-col">
      {/* Header */}
      <div className="pt-12 px-5 pb-4 border-b border-border">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <div>
            <h1 className="text-section text-foreground font-semibold">{report.type} Results</h1>
            <p className="text-body-sm text-text-secondary">
              {report.lab_name || 'Unknown Lab'} • {new Date(report.date || report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto flex items-center gap-2"
            onClick={() => setCurrentScreen('report-explanation')}
          >
            <FileText className="w-4 h-4" />
            View Explanation
          </Button>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="px-5 py-2 bg-background border-b border-border">
        <div className="flex p-1 bg-muted rounded-lg">
          <button
            onClick={() => setViewMode('results')}
            className={cn(
              "flex-1 py-1.5 text-body-sm font-medium rounded-md transition-all",
              viewMode === 'results' ? "bg-card shadow-sm text-foreground" : "text-text-secondary hover:text-foreground"
            )}
          >
            Results
          </button>
          <button
            onClick={() => setViewMode('analysis')}
            className={cn(
              "flex-1 py-1.5 text-body-sm font-medium rounded-md transition-all",
              viewMode === 'analysis' ? "bg-card shadow-sm text-foreground" : "text-text-secondary hover:text-foreground"
            )}
          >
            Smart Analysis
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-32 custom-scrollbar">
        {/* Report Image Section - Always Visible */}
        {report.image_url && (
          <div className="mb-8 animate-fade-in relative z-10">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-body-lg font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Original Report
              </h3>
              <span className="text-caption text-text-tertiary bg-muted px-2 py-1 rounded-md">
                Scanned Image
              </span>
            </div>

            <div className="rounded-2xl overflow-hidden border border-border/60 bg-card shadow-sm relative min-h-[250px] flex items-center justify-center group transition-all hover:shadow-md">
              {/* Pattern Background for premium feel */}
              <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />

              {/* Fallback Icon */}
              <FileText className="w-16 h-16 text-text-tertiary/20 absolute z-0" />

              {/* Image */}
              <img
                src={getStorageUrl(report.image_url)}
                alt="Original Report"
                className="w-full h-auto max-h-[500px] object-contain mx-auto relative z-10 transition-transform duration-300 group-hover:scale-[1.01]"
                onError={(e) => e.currentTarget.style.display = 'none'}
              />

              {/* Overlay Gradient (bottom) */}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/5 to-transparent pointer-events-none opacity-50" />
            </div>
          </div>
        )}

        {viewMode === 'analysis' ? (
          <ReportSynthesis reportId={currentReportId!} />
        ) : (
          <>
            {/* Failed Status */}
            {report.status === 'failed' && (
              <div className="card-elevated p-5 mb-6 border-l-4 border-l-destructive bg-destructive/10">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className="w-6 h-6 text-destructive" />
                  <h2 className="text-subtitle text-foreground font-semibold">Processing Failed</h2>
                </div>
                <p className="text-body text-text-secondary">
                  {report.error_message || "We couldn't extract data from this image. Please ensure it's a clear photo of a medical lab report."}
                </p>
              </div>
            )}

            {/* Processing Status */}
            {report.status === 'processing' && (
              <div className="card-elevated p-5 mb-6 border-l-4 border-l-primary bg-primary/10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <h2 className="text-subtitle text-foreground font-semibold">Processing...</h2>
                </div>
                <p className="text-body text-text-secondary">
                  {report.progress ? `Analyzing report (${report.progress}%)` : "We are analyzing your report. This might take a moment."}
                </p>
              </div>
            )}

            {/* Results or Empty State */}
            {results.length > 0 ? (
              <>
                {/* Summary Card */}
                <div className={cn(
                  "card-elevated p-5 mb-6 border-l-4",
                  overallStatus === 'warning' ? 'border-l-warning bg-warning-light' : 'border-l-success bg-success-light'
                )}>
                  <div className="flex items-center gap-3 mb-3">
                    {overallStatus === 'warning' ? (
                      <AlertTriangle className="w-6 h-6 text-warning" />
                    ) : (
                      <Check className="w-6 h-6 text-success" />
                    )}
                    <h2 className="text-subtitle text-foreground font-semibold">
                      {overallStatus === 'warning' ? 'Attention Needed' : 'Normal'}
                    </h2>
                  </div>
                  <ul className="space-y-1">
                    <li className="text-body text-text-secondary flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                      {results.filter(r => r.flag !== 'normal').length} values out of range
                    </li>
                    <li className="text-body text-text-secondary flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-success" />
                      {results.filter(r => r.flag === 'normal').length} values within normal range
                    </li>
                  </ul>
                </div>
              </>
            ) : report.status === 'completed' ? (
              <div className="text-center py-10">
                <p className="text-body text-text-secondary">No structured data found in this report.</p>
              </div>
            ) : null}

            {/* Results Table */}
            <div className="space-y-3">
              {results.map((result, index) => (
                <div key={index} className="card-elevated overflow-hidden">
                  {/* Row Header */}
                  <button
                    onClick={() => setExpandedRow(expandedRow === index ? null : index)}
                    className="w-full p-4 flex items-center gap-4 text-left"
                  >
                    <div className={cn("w-3 h-3 rounded-full", getFlagColor(result.flag))} />
                    <div className="flex-1 min-w-0">
                      <p className="text-body-lg text-foreground font-medium">{result.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-body font-semibold text-primary">{result.value}</span>
                        <span className="text-body-sm text-text-tertiary">({result.range})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getFlagIcon(result.flag)}
                      {expandedRow === index ? (
                        <ChevronUp className="w-5 h-5 text-text-secondary" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-text-secondary" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Explanation */}
                  {expandedRow === index && (
                    <div className="px-4 pb-4 pt-0 border-t border-border animate-fade-in">
                      <div className="pt-4 space-y-4">
                        <div>
                          <h4 className="text-body font-semibold text-foreground mb-1">What is this test?</h4>
                          <p className="text-body text-text-secondary">{result.explanation.what}</p>
                        </div>
                        <div>
                          <h4 className="text-body font-semibold text-foreground mb-1">What your result means</h4>
                          <p className="text-body text-text-secondary">{result.explanation.meaning}</p>
                        </div>
                        <div>
                          <h4 className="text-body font-semibold text-foreground mb-1">Common causes</h4>
                          <ul className="space-y-1">
                            {result.explanation.causes.map((cause, i) => (
                              <li key={i} className="text-body text-text-secondary flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-text-tertiary" />
                                {cause}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-body font-semibold text-foreground mb-1">Next steps</h4>
                          <ul className="space-y-1">
                            {result.explanation?.next_steps?.map((step, i) => (
                              <li key={i} className="text-body text-text-secondary flex items-center gap-2">
                                <Check className="w-4 h-4 text-success shrink-0" />
                                {step}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Fixed Bottom Bar */}
      <div className="absolute bottom-0 left-0 right-0 px-5 py-4 bg-card border-t border-border flex items-center gap-3">

        <Button size="default" className="flex-1">
          Save to ABDM
        </Button>
        <Button variant="secondary" size="default" className="flex-1">
          <Share2 className="w-5 h-5 mr-2" />
          Share
        </Button>
      </div>

      {currentReportId && <Chatbot reportId={currentReportId} />}
    </div>
  );
}
