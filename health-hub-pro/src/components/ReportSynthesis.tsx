import React, { useState, useEffect } from 'react';
import { getReportSynthesis, generateReportSynthesis } from '@/lib/api';
import { Loader2, TrendingUp, FileCheck, Stethoscope, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface ReportSynthesisProps {
    reportId: string;
}

export function ReportSynthesis({ reportId }: ReportSynthesisProps) {
    const [synthesis, setSynthesis] = useState<{
        status_summary: string;
        key_trends: string[];
        doctor_precis: string;
        status?: string;
    } | null>(null);

    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    const fetchSynthesis = async () => {
        try {
            setLoading(true);
            const data = await getReportSynthesis(reportId);
            setSynthesis(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (reportId) {
            fetchSynthesis();
        }
    }, [reportId]);

    // Poll for updates if pending
    useEffect(() => {
        if (synthesis?.status === 'pending') {
            const interval = setInterval(fetchSynthesis, 3000); // Poll every 3s
            return () => clearInterval(interval);
        }
    }, [synthesis?.status]);

    const handleRetry = async () => {
        try {
            setIsGenerating(true);
            toast.info("Starting fresh analysis...");
            await generateReportSynthesis(reportId);
            // After triggering, fetch immediately to see "pending" status
            await fetchSynthesis();
        } catch (err) {
            toast.error("Failed to start analysis");
        } finally {
            setIsGenerating(false);
        }
    };

    if (loading && !synthesis) {
        return (
            <div className="w-full card-elevated p-6 flex flex-col items-center justify-center min-h-[200px] animate-pulse">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                <p className="text-body text-text-secondary">Checking analysis status...</p>
            </div>
        );
    }

    // PENDING STATE
    if (synthesis?.status === 'pending') {
        return (
            <div className="w-full card-elevated p-8 flex flex-col items-center justify-center min-h-[200px] text-center space-y-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                    <Loader2 className="w-10 h-10 text-primary animate-spin relative z-10" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Analyzing Report...</h3>
                    <p className="text-body text-text-secondary">Comparing with history & generating insights.</p>
                </div>
            </div>
        );
    }

    // FAILED OR MISSING STATE
    if (!synthesis || synthesis.status === 'failed' || synthesis.status === 'missing' || synthesis.status === 'not_generated') {
        const isFailed = synthesis?.status === 'failed';
        return (
            <div className="w-full card-elevated p-6 flex flex-col items-center justify-center min-h-[150px] bg-secondary/5 border border-secondary/20 text-center">
                {isFailed ? (
                    <AlertCircle className="w-8 h-8 text-destructive mb-3" />
                ) : (
                    <Zap className="w-8 h-8 text-primary mb-3" />
                )}

                <h3 className="text-body font-semibold text-foreground mb-1">
                    {isFailed ? "Analysis Failed" : "Smart Analysis Available"}
                </h3>
                <p className="text-caption text-text-tertiary mb-4 max-w-xs mx-auto">
                    {isFailed
                        ? "We encountered an issue generating your report summary."
                        : "Generate a comprehensive summary and trend analysis for this report."}
                </p>

                <Button
                    onClick={handleRetry}
                    disabled={isGenerating}
                    variant={isFailed ? "destructive" : "default"}
                    size="sm"
                    className="gap-2"
                >
                    {isGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <RefreshCw className="w-4 h-4" />
                    )}
                    {isGenerating ? "Starting..." : (isFailed ? "Retry Analysis" : "Generate Analysis")}
                </Button>
            </div>
        );
    }

    // COMPLETED STATE
    return (
        <div className="space-y-4 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-section text-foreground font-bold flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-primary" />
                    Smart Synthesis
                </h2>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRetry}
                    title="Regenerate Analysis"
                    className="h-8 w-8 text-text-tertiary hover:text-primary"
                >
                    <RefreshCw className="w-4 h-4" />
                </Button>
            </div>

            {/* Doctor's Precis */}
            <div className="card-elevated p-5 bg-gradient-to-br from-card to-primary/5 border-l-4 border-primary">
                <h3 className="text-body font-semibold text-foreground mb-2 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-primary" />
                    Doctor's Précis
                </h3>
                <p className="text-body text-text-secondary leading-relaxed">
                    {synthesis.doctor_precis}
                </p>
            </div>

            {/* Key Trends */}
            {synthesis.key_trends?.length > 0 && (
                <div className="card-elevated p-5">
                    <h3 className="text-body font-semibold text-foreground mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-warning" />
                        Key Trends
                    </h3>
                    <ul className="space-y-3">
                        {synthesis.key_trends.map((trend, i) => (
                            <li key={i} className="flex gap-3 items-start">
                                <div className="w-1.5 h-1.5 rounded-full bg-warning mt-2 shrink-0" />
                                <span className="text-body text-text-secondary">{trend}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Status Summary */}
            <div className="card-elevated p-5">
                <p className="text-body-sm text-text-tertiary uppercase tracking-wider font-bold mb-1">
                    Current Status
                </p>
                <p className="text-body-lg text-foreground font-medium">
                    {synthesis.status_summary}
                </p>
            </div>
        </div>
    );
}
