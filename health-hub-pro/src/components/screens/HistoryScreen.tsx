import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TabBar } from '@/components/TabBar';
import { Search, MoreVertical, FileText, Check, ChevronDown, BarChart3, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listReports, deleteReport } from '@/lib/api';
import { toast } from 'sonner';

export function HistoryScreen() {
  const { setCurrentScreen, setCurrentReportId, viewingMember, setViewingMember } = useApp();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [filters, setFilters] = useState({
    type: 'ALL TYPES',
    flag: 'FLAG LEVEL',
    time: 'TIME',
  });
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  const filterOptions = {
    type: ['All Types', 'CBC', 'BMP', 'CMP', 'Lipid Panel', 'LFT', 'HbA1c', 'Thyroid', 'Urine', 'Stool', 'Genetic', 'Other'],
    flag: ['All', 'Red', 'Yellow', 'Green'],
    time: ['All Time', 'Last 7 Days', 'Last Month', 'Last 3 Months'],
  };

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        const result = await listReports({
          page: 1,
          limit: 50,
          report_type: filters.type !== 'ALL TYPES' ? filters.type : undefined,
          flag_level: filters.flag !== 'FLAG LEVEL' ? filters.flag.toLowerCase() as 'green' | 'yellow' | 'red' : undefined,
          time_range: filters.time === 'All Time' ? 'all' :
            filters.time === 'Last 7 Days' ? '7d' :
              filters.time === 'Last Month' ? '30d' :
                filters.time === 'Last 3 Months' ? '90d' : 'all',
          user_id: viewingMember?.profiles?.id,
        });

        // Transform backend format to frontend format
        const transformedReports = result.items.map((r: any) => ({
          id: r.id,
          date: new Date(r.date || r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          type: r.type,
          labName: r.lab_name || 'Unknown Lab',
          flagLevel: r.flag_level,
          uploadedToABDM: r.uploaded_to_abdm || false,
        }));

        setReports(transformedReports);
      } catch (error: any) {
        console.error('Failed to load reports:', error);
        toast.error('Failed to load reports. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, [filters, viewingMember]); // Reload when viewingMember changes

  // Extract loadReports to allow manual refresh if needed, but for now relying on filters update is hacky.
  // Better: add a refresh trigger.
  const refreshReports = () => {
    setFilters({ ...filters }); // Trigger useEffect
  };

  const flagColors = {
    green: 'bg-success',
    yellow: 'bg-warning',
    red: 'bg-destructive',
  };

  const handleReportClick = (reportId: string) => {
    if (isCompareMode || isDeleteMode) {
      if (selectedReports.includes(reportId)) {
        setSelectedReports(selectedReports.filter(id => id !== reportId));
      } else {
        // Limit compare to 2, but delete is unlimited
        if (isCompareMode && selectedReports.length >= 2) return;
        setSelectedReports([...selectedReports, reportId]);
      }
    } else {
      setCurrentReportId(reportId);
      setCurrentScreen('report-result');
    }
  };

  const toggleCompareMode = () => {
    setIsCompareMode(!isCompareMode);
    setIsDeleteMode(false);
    setSelectedReports([]);
  };

  const toggleDeleteMode = () => {
    setIsDeleteMode(!isDeleteMode);
    setIsCompareMode(false);
    setSelectedReports([]);
    setShowMenu(false);
  };

  const handleDelete = async () => {
    if (viewingMember) {
      toast.error('Cannot delete shared reports');
      return;
    }
    if (selectedReports.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedReports.length} reports?`)) return;

    try {
      setLoading(true);
      await Promise.all(selectedReports.map(id => deleteReport(id)));

      // Optimistic update: remove deleted reports from local state immediately
      setReports(prevReports => prevReports.filter(r => !selectedReports.includes(r.id)));

      toast.success('Reports deleted successfully');
      setIsDeleteMode(false);
      setSelectedReports([]);
      // refreshReports(); // No longer needed if optimistic update works
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete reports');
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(report =>
    report.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.labName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="absolute inset-0 bg-background overflow-hidden flex flex-col">
      {/* Header */}
      <div className="pt-12 px-5 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-title text-foreground">
              {viewingMember
                ? `${viewingMember.nickname || viewingMember.profiles?.first_name}'s History`
                : 'History'}
            </h1>
            {viewingMember && (
              <button
                onClick={() => setViewingMember(null)}
                className="text-body-sm text-primary text-left"
              >
                Back to my reports
              </button>
            )}
          </div>
          {!viewingMember && (
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors relative"
            >
              <MoreVertical className="w-5 h-5 text-primary" />

              {showMenu && (
                <div className="absolute top-full right-0 mt-1 w-28 bg-card rounded-lg shadow-lg border border-border overflow-hidden z-50">
                  <button
                    onClick={toggleDeleteMode}
                    className="w-full px-4 py-3 text-left text-body text-destructive hover:bg-destructive-light transition-colors"
                  >
                    Delete Reports
                  </button>
                </div>
              )}
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative mt-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-12 pr-4 rounded-lg bg-muted text-body-lg text-foreground placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-4">
          {Object.entries(filters).map(([key, value]) => (
            <div key={key} className="relative flex-1">
              <button
                onClick={() => setOpenFilter(openFilter === key ? null : key)}
                className="w-full h-9 px-3 rounded-lg bg-muted flex items-center justify-between text-body-sm text-text-secondary"
              >
                <span className="truncate">{value}</span>
                <ChevronDown className="w-4 h-4 shrink-0" />
              </button>
              {openFilter === key && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-lg shadow-lg border border-border z-50 max-h-48 overflow-y-auto">
                  {filterOptions[key as keyof typeof filterOptions].map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setFilters({ ...filters, [key]: option.toUpperCase() });
                        setOpenFilter(null);
                      }}
                      className="w-full px-3 py-2 text-left text-body-sm text-foreground hover:bg-muted transition-colors"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Report List */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-36 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-body text-text-secondary">Loading reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-body text-text-secondary">No reports found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report, index) => (
              <button
                key={report.id}
                onClick={() => handleReportClick(report.id)}
                className={cn(
                  "w-full card-elevated p-4 flex gap-4 text-left transition-all animate-fade-in",
                  (isCompareMode || isDeleteMode) && selectedReports.includes(report.id) && "ring-2 ring-primary"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Checkbox (Compare/Delete Mode) */}
                {(isCompareMode || isDeleteMode) && (
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                    selectedReports.includes(report.id)
                      ? "bg-primary border-primary"
                      : "border-border"
                  )}>
                    {selectedReports.includes(report.id) && (
                      <Check className="w-4 h-4 text-primary-foreground" />
                    )}
                  </div>
                )}

                {/* Document Icon */}
                <div className="w-16 h-16 rounded-xl bg-primary/5 flex items-center justify-center relative">
                  <FileText className="w-8 h-8 text-primary" />
                  <div className={cn(
                    "absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-card",
                    flagColors[report.flagLevel]
                  )} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-caption text-text-tertiary">{report.date}</p>
                  <p className="text-section text-foreground font-semibold truncate">{report.type}</p>
                  <p className="text-body text-text-secondary truncate">{report.labName}</p>
                </div>

                {/* ABDM Status */}
                {report.uploadedToABDM && (
                  <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-success" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Compare/Delete FAB */}
      {(isCompareMode || isDeleteMode) && (
        <div className="fixed bottom-24 right-5 flex flex-col gap-2 items-end">
          {/* Cancel Button */}
          <button
            onClick={() => {
              setIsCompareMode(false);
              setIsDeleteMode(false);
              setSelectedReports([]);
            }}
            className="px-4 py-2 rounded-full bg-card shadow-md border border-border text-body-sm font-medium text-text-secondary"
          >
            Cancel
          </button>

          <button
            onClick={isDeleteMode ? handleDelete : toggleCompareMode}
            className={cn(
              "px-5 py-3 rounded-full shadow-primary flex items-center gap-2 transition-all",
              isDeleteMode
                ? "bg-destructive text-white"
                : (selectedReports.length === 2
                  ? "bg-success text-success-foreground"
                  : "bg-gradient-primary text-primary-foreground")
            )}
            disabled={isCompareMode && selectedReports.length !== 2} // Compare needs exactly 2?
          >
            {isDeleteMode ? (
              <>
                <Trash2 className="w-5 h-5" />
                <span className="text-body font-semibold">
                  Delete ({selectedReports.length})
                </span>
              </>
            ) : (
              <>
                <BarChart3 className="w-5 h-5" />
                <span className="text-body font-semibold">
                  {selectedReports.length === 2
                    ? "Compare Now"
                    : `Select 2 Reports`}
                </span>
              </>
            )}

          </button>
        </div>
      )}

      {/* Compare FAB Trigger (Only show if not in a mode) */}
      {(!isCompareMode && !isDeleteMode) && (
        <button
          onClick={toggleCompareMode}
          className="fixed bottom-24 right-5 px-5 py-3 rounded-full shadow-primary flex items-center gap-2 transition-all bg-gradient-primary text-primary-foreground"
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-body font-semibold">Compare</span>
        </button>
      )}

      <TabBar />
    </div>
  );
}
