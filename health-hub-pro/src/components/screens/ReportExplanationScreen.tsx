import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { ArrowLeft, Share2, Download, MessageCircle, AlertTriangle, Check, Brain, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getReport, getReportParameters } from '@/lib/api';
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
    const [loading, setLoading] = useState(true);

    const handleBack = () => {
        setCurrentScreen('report-result');
    };

    useEffect(() => {
        const loadData = async () => {
            if (!currentReportId) return;
            try {
                setLoading(true);
                const [reportData, paramsData] = await Promise.all([
                    getReport(currentReportId),
                    getReportParameters(currentReportId)
                ]);
                setReport(reportData);
                setItems(paramsData as any);
            } catch (err) {
                console.error(err);
                toast.error('Failed to load explanation');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [currentReportId]);

    const abnormalItems = items.filter(i => i.flag !== 'normal');
    const normalItems = items.filter(i => i.flag === 'normal');

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

                    {/* 1. Report Overview */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-5 h-5 text-primary" />
                            <h2 className="text-subtitle font-bold text-foreground">Report Overview</h2>
                        </div>
                        <div className="card-elevated p-5 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-body-sm text-text-tertiary">Patient</p>
                                    <p className="text-body font-medium text-foreground">{user?.firstName || 'User'} {user?.lastName || ''}</p>
                                </div>
                                <div>
                                    <p className="text-body-sm text-text-tertiary">Age & Sex</p>
                                    {/* Fallback as we don't have full metrics here yet */}
                                    <p className="text-body font-medium text-foreground">{user?.gender || 'Unknown'}, {user?.dateOfBirth ? new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear() : '--'} yrs</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-body-sm text-text-tertiary">Test</p>
                                    <p className="text-body font-medium text-foreground">{report?.type || 'Unknown Test'}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 2. Explanation of Results */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2">
                            <Brain className="w-5 h-5 text-primary" />
                            <h2 className="text-subtitle font-bold text-foreground">Explanation of Your Results</h2>
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
                                                    <p className="text-body-sm font-semibold text-foreground mb-1">What this value is:</p>
                                                    <p className="text-body-sm text-text-secondary leading-relaxed">
                                                        {item.explanation?.what || 'A measure of specific biomarkers in your blood.'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-body-sm font-semibold text-foreground mb-1">General Explanation:</p>
                                                    <p className="text-body-sm text-text-secondary leading-relaxed">
                                                        {item.explanation?.meaning || 'This value is outside the standard reference range.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Normal Values */}
                        {normalItems.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-body-lg font-semibold text-foreground flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-success" />
                                    Values Within Reference Range
                                </h3>
                                <div className="card-elevated p-5">
                                    <p className="text-body text-text-secondary mb-3">
                                        All other components are within their standard reference ranges:
                                    </p>
                                    <ul className="space-y-2">
                                        {normalItems.map((item, idx) => (
                                            <li key={idx} className="text-body-sm text-text-secondary flex items-start gap-2">
                                                <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                                                <span>
                                                    <span className="font-medium text-foreground">{item.name}</span>: Within normal range ({item.range}).
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* 3. Suggested Questions */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-primary" />
                            <h2 className="text-subtitle font-bold text-foreground">Suggested Questions for Your Doctor</h2>
                        </div>
                        <div className="card-elevated p-5 bg-primary/5 border-primary/10">
                            <p className="text-body-sm text-text-secondary mb-4">To better understand your results, you could ask:</p>
                            <ul className="space-y-3">
                                <li className="flex gap-3">
                                    <span className="text-primary font-bold">"</span>
                                    <p className="text-body text-foreground italic">What does this combination of results typically indicate?</p>
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-primary font-bold">"</span>
                                    <p className="text-body text-foreground italic">Do I need any follow-up tests based on these findings?</p>
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-primary font-bold">"</span>
                                    <p className="text-body text-foreground italic">Are there any lifestyle or dietary changes you recommend?</p>
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-primary font-bold">"</span>
                                    <p className="text-body text-foreground italic">When should I repeat this test?</p>
                                </li>
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
                            <div>
                                <h4 className="text-body font-semibold text-foreground mb-1">Nutrition</h4>
                                <p className="text-body-sm text-text-secondary">Maintaining a balanced diet rich in whole foods supports overall health.</p>
                            </div>
                            <div>
                                <h4 className="text-body font-semibold text-foreground mb-1">Hydration</h4>
                                <p className="text-body-sm text-text-secondary">Drinking adequate water is important for all bodily functions and test accuracy.</p>
                            </div>
                            <div>
                                <h4 className="text-body font-semibold text-foreground mb-1">Follow-up</h4>
                                <p className="text-body-sm text-text-secondary">It is important to share this full report with your doctor for personalized advice.</p>
                            </div>
                        </div>
                    </section>

                    {/* AI Promo */}
                    <div className="bg-gradient-primary rounded-2xl p-6 text-white text-center">
                        <Brain className="w-8 h-8 text-white/90 mx-auto mb-3" />
                        <h3 className="text-subtitle font-bold mb-2">Need More Clarification?</h3>
                        <p className="text-white/80 text-body-sm mb-4">
                            ask our MediGuide AI Chatbot for instant help in plain English or 12+ Indian languages.
                        </p>
                        <Button
                            variant="secondary"
                            className="w-full bg-white text-primary hover:bg-white/90"
                            onClick={() => setCurrentScreen('report-result')}
                        >
                            Ask AI Assistant
                        </Button>
                    </div>

                    <div className="h-8" /> {/* Spacer */}
                </div>
            </div>
        </div>
    );
}
