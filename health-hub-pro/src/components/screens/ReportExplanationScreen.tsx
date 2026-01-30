import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { ArrowLeft, Share2, Download, MessageCircle, AlertTriangle, Check, Brain, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getReport, getReportParameters, getReportSynthesis } from '@/lib/api';
import { toast } from 'sonner';

interface ExplanationItem {
    id: string;
    name: string;
    value: string;
    range: string;
    unit?: string;
    flag: 'normal' | 'high' | 'low';
    explanation?: {
        what: string;
        meaning: string;
        causes: string[];
        next_steps: string[];
    };
}

export function ReportExplanationScreen() {
    const { setCurrentScreen, currentReportId, user } = useApp();
    const [report, setReport] = useState<any>(null);
    const [items, setItems] = useState<ExplanationItem[]>([]);
    const [synthesis, setSynthesis] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Filter metadata from standard items
    const metadataParams = items.filter(i => i.name.startsWith('METADATA_'));
    const displayItems = items.filter(i => !i.name.startsWith('METADATA_'));

    const abnormalItems = displayItems.filter(i => i.flag !== 'normal');
    const normalItems = displayItems.filter(i => i.flag === 'normal');

    // Extract Metadata
    const patientAge = metadataParams.find(i => i.name === 'METADATA_AGE')?.value;
    const patientSex = metadataParams.find(i => i.name === 'METADATA_SEX')?.value;
    const clinicalSummary = metadataParams.find(i => i.name === 'METADATA_CLINICAL_SUMMARY')?.value;
    const overallIndication = metadataParams.find(i => i.name === 'METADATA_INDICATION')?.value;
    const rawSystemSummaries = metadataParams.find(i => i.name === 'METADATA_SYSTEM_SUMMARIES')?.value;

    let systemSummaries: any[] = [];
    try {
        if (rawSystemSummaries) systemSummaries = JSON.parse(rawSystemSummaries);
    } catch (e) {
        console.error("Failed to parse system summaries", e);
    }

    const handleBack = () => {
        setCurrentScreen('report-result');
    };

    useEffect(() => {
        const loadExplanation = async () => {
            if (!currentReportId) {
                console.error("No report ID found");
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const [reportData, paramsData, synthesisData] = await Promise.all([
                    getReport(currentReportId),
                    getReportParameters(currentReportId),
                    getReportSynthesis(currentReportId)
                ]);
                setReport(reportData);
                setItems(paramsData as any);
                setSynthesis(synthesisData);
            } catch (err) {
                console.error(err);
                toast.error('Failed to load explanation');
            } finally {
                setLoading(false);
            }
        };
        loadExplanation();
    }, [currentReportId]);

    if (loading) {
        return (
            <div className="absolute inset-0 bg-background flex items-center justify-center">
                <p className="text-body text-text-secondary">Loading analysis...</p>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 bg-background overflow-hidden flex flex-col">
            {/* Header */}
            <div className="pt-12 px-5 pb-4 border-b border-border bg-card z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-foreground" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-section text-foreground font-semibold">Report Overview</h1>
                        <p className="text-body-sm text-text-secondary">
                            AI-Generated • Educational Only
                        </p>
                    </div>
                    <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
                        <Download className="w-5 h-5 text-text-secondary" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-2xl mx-auto p-5 space-y-8">

                    {/* Disclaimer */}
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
                        <Brain className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <p className="text-body-sm text-text-secondary leading-relaxed">
                            This explanation is for educational purposes only. Consult your doctor for medical advice.
                        </p>
                    </div>

                    {/* 1. Clinical Summary (New) */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Brain className="w-5 h-5 text-primary" />
                                <h2 className="text-subtitle font-bold text-foreground">Clinical Summary</h2>
                            </div>
                            {overallIndication && (
                                <div className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                    overallIndication === 'Normal' ? "bg-success/10 text-success" :
                                        overallIndication === 'Mildly Abnormal' ? "bg-warning/10 text-warning" : "bg-error/10 text-error"
                                )}>
                                    {overallIndication}
                                </div>
                            )}
                        </div>
                        <div className="card-elevated p-5 bg-primary/5 border-primary/10">
                            <p className="text-body text-text-secondary leading-relaxed">
                                {clinicalSummary || 'Analyzing your results to provide a comprehensive summary...'}
                            </p>
                        </div>
                    </section>

                    {/* 2. Report Overview */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-5 h-5 text-primary" />
                            <h2 className="text-subtitle font-bold text-foreground">Report Details</h2>
                        </div>
                        <div className="card-elevated p-5 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-body-sm text-text-tertiary">Patient</p>
                                    <p className="text-body font-medium text-foreground">{report?.patient_name || 'Patient name not provided in lab report'}</p>
                                </div>
                                <div>
                                    <p className="text-body-sm text-text-tertiary">Age & Sex</p>
                                    <p className="text-body font-medium text-foreground">
                                        {patientAge || patientSex ? (
                                            <>
                                                {patientAge && patientSex ? `${patientAge} / ${patientSex}` : (patientAge || patientSex)}
                                            </>
                                        ) : 'Not provided in lab report'}
                                    </p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-body-sm text-text-tertiary">Test Type</p>
                                    <p className="text-body font-medium text-foreground">{report?.type || 'Unknown Test'}</p>
                                </div>
                            </div>
                        </div>
                    </section>


                    {/* 3. Explanation of Results */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2">
                            <Brain className="w-5 h-5 text-primary" />
                            <h2 className="text-subtitle font-bold text-foreground">Findings & Interpretation</h2>
                        </div>

                        {/* Abnormal Values */}
                        {abnormalItems.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-body-lg font-semibold text-foreground flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-warning" />
                                    Values Outside Reference Range
                                </h3>

                                <div className="space-y-4">
                                    {abnormalItems.map((item, idx) => (
                                        <div key={idx} className="card-elevated p-5 border-l-4 border-l-warning">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="text-body-lg font-bold text-foreground">{item.name}</h4>
                                                    <p className="text-body text-text-secondary mt-1">
                                                        <span className="font-semibold text-warning">{item.value} {item.unit}</span>
                                                        <span className="text-text-tertiary text-sm mx-2">→</span>
                                                        <span className="text-body-sm text-text-secondary">Marked as {item.flag === 'high' ? 'High' : 'Low'}</span>
                                                    </p>
                                                    <p className="text-body-xs text-text-tertiary mt-1">Reference: {item.range}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-3 mt-4 pt-4 border-t border-border/50">
                                                <div>
                                                    <p className="text-body-sm font-semibold text-foreground mb-1">What this measures:</p>
                                                    <p className="text-body-sm text-text-secondary leading-relaxed">
                                                        {item.explanation?.what || 'A measure of specific biomarkers in your blood.'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-body-sm font-semibold text-foreground mb-1">Simple Explanation:</p>
                                                    <p className="text-body-sm text-text-secondary leading-relaxed">
                                                        {item.explanation?.meaning || 'This biomarker is outside the standard reference range.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Normal Values (Grouped) */}
                        <div className="space-y-4">
                            <h3 className="text-body-lg font-semibold text-foreground flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-success" />
                                Values Within Reference Range
                            </h3>

                            {systemSummaries.length > 0 ? (
                                <div className="space-y-4">
                                    {systemSummaries.map((sys, idx) => (
                                        <div key={idx} className="card-elevated p-5">
                                            <div className="flex items-center justify-between mb-3 pb-3 border-b border-border/50">
                                                <h4 className="text-body font-bold text-foreground">{sys.category}</h4>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                    sys.status === 'Normal' ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                                                )}>
                                                    {sys.status}
                                                </span>
                                            </div>
                                            <p className="text-body-sm text-text-secondary leading-relaxed">
                                                {sys.description}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="card-elevated p-5">
                                    <p className="text-body text-text-secondary mb-3">
                                        All other components are within their standard reference ranges:
                                    </p>
                                    <ul className="space-y-2">
                                        {normalItems.map((item, idx) => (
                                            <li key={idx} className="text-body-sm text-text-secondary flex items-start gap-2">
                                                <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                                                <span>
                                                    <span className="font-medium text-foreground">{item.name}</span>: Within normal range.
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 4. Suggested Questions */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-primary" />
                            <h2 className="text-subtitle font-bold text-foreground">Suggested Questions for Your Doctor</h2>
                        </div>
                        <div className="card-elevated p-5 bg-primary/5 border-primary/10">
                            <p className="text-body-sm text-text-secondary mb-4">To better understand your results, you could ask:</p>
                            <ul className="space-y-3">
                                {(synthesis?.suggested_questions && synthesis.suggested_questions.length > 0) ? (
                                    synthesis.suggested_questions.map((q: string, i: number) => (
                                        <li key={i} className="flex gap-3">
                                            <span className="text-primary font-bold">"</span>
                                            <p className="text-body text-foreground italic">{q}</p>
                                        </li>
                                    ))
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        <li className="flex gap-3">
                                            <span className="text-primary font-bold">"</span>
                                            <p className="text-body text-foreground italic">What does this combination of results typically indicate?</p>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="text-primary font-bold">"</span>
                                            <p className="text-body text-foreground italic">Do I need any follow-up tests based on these findings?</p>
                                        </li>
                                    </div>
                                )}
                            </ul>
                        </div>
                    </section>

                    {/* 4. Wellness Recommendations */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                                <div className="w-2.5 h-2.5 rounded-full bg-success" />
                            </div>
                            <h2 className="text-subtitle font-bold text-foreground">General Wellness Recommendations</h2>
                        </div>
                        <div className="card-elevated p-5 space-y-4">
                            {(synthesis?.wellness_recommendations && synthesis.wellness_recommendations.length > 0) ? (
                                synthesis.wellness_recommendations.map((rec: any, i: number) => (
                                    <div key={i}>
                                        <h4 className="text-body font-semibold text-foreground mb-1">{rec.title}</h4>
                                        <p className="text-body-sm text-text-secondary">{rec.description}</p>
                                    </div>
                                ))
                            ) : (
                                <div>
                                    <p className="text-body-sm text-text-secondary italic">Getting personalized lifestyle tips based on your results...</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* AI Promo
 */}

                    <div className="h-8" /> {/* Spacer */}
                </div>
            </div>
        </div>
    );
}
