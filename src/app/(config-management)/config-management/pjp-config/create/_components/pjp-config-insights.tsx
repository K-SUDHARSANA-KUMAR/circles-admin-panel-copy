'use client';

import { Badge } from '@/components/ui/badge';
import GenericError from '@/components/ui/generic-error';
import Loading from '@/components/ui/loading';
import { DataTable } from '@/components/ui/data-table';
import { PjpInsights } from '@/features/config-management/pjp-config/api/pjp-config';
import { ColumnDef } from '@tanstack/react-table';
import {
  Warehouse,
  Users,
  Settings,
  TrendingUp,
  Clock,
  AlertCircle,
  Calendar,
} from 'lucide-react';

interface PjpConfigInsightsProps {
  isLoading: boolean;
  error: unknown;
  data?: PjpInsights;
}

const PjpConfigInsights = ({
  isLoading,
  error,
  data,
}: PjpConfigInsightsProps) => {
  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loading text="Loading insights..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-32 items-center justify-center">
        <GenericError text="Failed to load insights" />
      </div>
    );
  }

  if (!data) return null;

  const isDeficit = data.salesForceInfo.excessOrDeficit < 0;
  const coverageColor =
    data.capacityAnalysis.coveragePercentage >= 90
      ? 'text-primary'
      : data.capacityAnalysis.coveragePercentage >= 70
        ? 'text-amber-600'
        : 'text-red-600';

  // Calculate total beats from daywise data
  const totalBeats = data.dayWiseBeats
    ? Object.values(data.dayWiseBeats).reduce(
        (sum, dayData) => sum + (dayData.beats?.length || 0),
        0
      )
    : 0;

  // Define columns for sales person details table
  const salesPersonColumns: ColumnDef<
    NonNullable<typeof data.salesForceInfo.salesPersonDetails>[0]
  >[] = [
    {
      id: 'serialNumber',
      header: 'S.No',
      cell: ({ row }) => row.index + 1,
    },
    {
      accessorKey: 'salesPersonEmployeeCode',
      id: 'salesPersonEmployeeCode',
      header: 'Employee Code',
    },
    {
      accessorKey: 'salesPersonName',
      id: 'salesPersonName',
      header: 'Sales Person Name',
    },
    {
      accessorKey: 'salesPersonRoleName',
      id: 'salesPersonRoleName',
      header: 'Role Name',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="rounded-lg border bg-card p-4 transition-shadow">
        <div className="mb-3 flex items-center gap-2">
          <Warehouse className="text-primary h-4 w-4" />
          <h3 className="text-sm font-semibold text-neutral-700">Warehouse</h3>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">Name</span>
            <span className="text-sm font-medium">
              {data.warehouseInfo.warehouseName}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">Total Outlets</span>
            <span className="text-lg font-bold text-neutral-900">
              {data.warehouseInfo.totalOutlets}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">Total Beats</span>
            <span className="text-lg font-bold text-neutral-900">
              {totalBeats}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 transition-shadow">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="text-primary h-4 w-4" />
            <h3 className="text-sm font-semibold text-neutral-700">
              Sales Force
            </h3>
          </div>
          {isDeficit && (
            <Badge variant="destructive" className="text-xs">
              Deficit
            </Badge>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">Total</span>
            <span className="text-lg font-bold text-neutral-900">
              {data.salesForceInfo.totalSalesPersons}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">Required</span>
            <span className="text-lg font-bold text-neutral-900">
              {data.salesForceInfo.requiredSalesPersons}
            </span>
          </div>
          <div className="my-2 h-px bg-neutral-200" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">Excess/Deficit</span>
            <span
              className={`text-lg font-bold ${isDeficit ? 'text-red-600' : 'text-primary'}`}
            >
              {data.salesForceInfo.excessOrDeficit > 0 ? '+' : ''}
              {data.salesForceInfo.excessOrDeficit}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-gradient-to-br from-green-50 to-white p-4 transition-shadow">
        <div className="mb-3 flex items-center gap-2">
          <AlertCircle className="text-primary h-4 w-4" />
          <h3 className="text-sm font-semibold text-neutral-700">Summary</h3>
        </div>
        <Badge variant="outline" className="mb-2">
          {data.summary.status}
        </Badge>
        <p className="text-sm leading-relaxed text-neutral-700">
          {data.summary.message}
        </p>
      </div>

      {data.salesForceInfo.salesPersonDetails &&
        data.salesForceInfo.salesPersonDetails.length > 0 && (
          <div className="rounded-lg border bg-card p-4 transition-shadow md:col-span-3">
            <div className="mb-4 flex items-center gap-2">
              <Users className="text-primary h-4 w-4" />
              <h3 className="text-sm font-semibold text-neutral-700">
                Sales Person Info
              </h3>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              <DataTable
                columns={salesPersonColumns}
                data={data.salesForceInfo.salesPersonDetails}
                tableId="pjp-config-sales-force-info"
                hidePagination={true}
                isColumnDisplay={false}
                isDownload={false}
              />
            </div>
          </div>
        )}

      {data.dayWiseBeats && Object.keys(data.dayWiseBeats).length > 0 && (
        <div className="rounded-lg border bg-card p-4 transition-shadow md:col-span-3">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="text-primary h-4 w-4" />
            <h3 className="text-sm font-semibold text-neutral-700">
              Day-Wise Beats
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
              const dayData = data.dayWiseBeats?.[day];
              if (!dayData || !dayData.beats || dayData.beats.length === 0) return null;

              const totalOutlets = dayData.beats.reduce((sum, beat) => sum + beat.totalOutlets, 0);
              const hasMoreThanThree = dayData.beats.length > 3;

              return (
                <div
                  key={day}
                  className="rounded-lg border border-neutral-200 bg-gradient-to-br from-secondary/10 to-white p-3"
                >
                  <div className="mb-2 flex items-start justify-between border-b border-neutral-200 pb-2">
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-800">
                        {day}
                      </h4>
                      <span className="text-xs text-neutral-500">
                        {dayData.beats.length} {dayData.beats.length === 1 ? 'Beat' : 'Beats'}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-neutral-500">Total Outlets</div>
                      <div className="text-lg font-bold text-primary">
                        {totalOutlets}
                      </div>
                    </div>
                  </div>
                  <div className={`space-y-2 ${hasMoreThanThree ? 'max-h-[240px] overflow-y-auto pr-1' : ''}`}>
                    {dayData.beats.map((beat, idx) => (
                      <div
                        key={beat.beatId}
                        className="rounded-md bg-card p-2 shadow-sm"
                      >
                        <div className="mb-1 text-xs font-medium text-neutral-800">
                          {beat.beatName}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-neutral-500">Outlets:</span>
                          <span className="text-sm font-bold text-primary">
                            {beat.totalOutlets}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-neutral-50 p-4 transition-shadow md:col-span-3">
        <div className="mb-3 flex items-center gap-2">
          <Settings className="text-primary h-4 w-4" />
          <h3 className="text-sm font-semibold text-neutral-700">
            Configuration
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div>
            <div className="mb-1 text-xs text-neutral-500">Frequency</div>
            <div className="font-semibold">
              {data.planConfiguration.planFrequency}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs text-neutral-500">Working Days</div>
            <div className="font-semibold">
              {data.planConfiguration.workingDays}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs text-neutral-500">Include Sundays</div>
            <div className="font-semibold">
              {data.planConfiguration.includeSundays ? 'Yes' : 'No'}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs text-neutral-500">Max/Day</div>
            <div className="font-semibold">
              {data.planConfiguration.maxOutletsPerDay}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs text-neutral-500">Activity (mins)</div>
            <div className="font-semibold">
              {data.planConfiguration.outletActivityDurationInMins}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs text-neutral-500">Working (mins)</div>
            <div className="font-semibold">
              {data.planConfiguration.totalWorkingHoursInMins}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs text-neutral-500">Break (mins)</div>
            <div className="font-semibold">
              {data.planConfiguration.breakHoursInMins}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs text-neutral-500">
              Effective (mins)
            </div>
            <div className="font-semibold">
              {data.planConfiguration.effectiveWorkingTimeInMins}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 transition-shadow">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="text-primary h-4 w-4" />
          <h3 className="text-sm font-semibold text-neutral-700">Capacity</h3>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">
              Outlets/Person/Period
            </span>
            <span className="text-sm font-semibold">
              {data.capacityAnalysis.outletsPerSalesPersonPerPeriod}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">
              Total Capacity/Period
            </span>
            <span className="text-sm font-semibold">
              {data.capacityAnalysis.totalCapacityPerPeriod}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">Avg/Person/Day</span>
            <span className="text-sm font-semibold">
              {data.capacityAnalysis.avgOutletsPerPersonPerDay}
            </span>
          </div>
          <div className="my-2 h-px bg-neutral-200" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">Coverage</span>
            <span className={`text-lg font-bold ${coverageColor}`}>
              {data.capacityAnalysis.coveragePercentage}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">Uncovered Outlets</span>
            <span className="text-sm font-semibold text-neutral-900">
              {data.capacityAnalysis.uncoveredOutlets}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 transition-shadow">
        <div className="mb-3 flex items-center gap-2">
          <Clock className="text-primary h-4 w-4" />
          <h3 className="text-sm font-semibold text-neutral-700">
            Time Feasibility
          </h3>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">Feasible/Day</span>
            <span className="text-lg font-bold text-neutral-900">
              {data.timeFeasibility.feasibleOutletsPerDay}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">Configured/Day</span>
            <span className="text-lg font-bold text-neutral-900">
              {data.timeFeasibility.configuredOutletsPerDay}
            </span>
          </div>
          <div className="my-2 h-px bg-neutral-200" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">Utilization</span>
            <span className="text-primary text-lg font-bold">
              {data.timeFeasibility.timeUtilizationPercentage}%
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 transition-shadow md:col-span-3">
        <div className="mb-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-neutral-700">
            Recommendations
          </h3>
        </div>
        <ul className="space-y-3">
          {data.recommendations.map((rec, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="mt-0.5 text-amber-600">•</span>
              <div className="flex-1">
                <span className="text-sm font-semibold text-neutral-900">
                  {rec.type}:
                </span>{' '}
                <span className="text-sm text-neutral-700">{rec.message}</span>
                {rec.suggestedAction && (
                  <div className="mt-1 text-xs text-neutral-600 italic">
                    → {rec.suggestedAction}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PjpConfigInsights;
