"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MasterRecordDropdown } from "@/components/shared/master-record-dropdown-filter";
import { useApprovalHierarchy } from "@/features/config-management/approval-hierarchy/hooks/useApprovalHierarchy";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import ClaimHierarchyCardAdd from "@/components/modals/claim-config/claim-hierarchy-card-add";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PlusIcon, Settings, MoreVertical } from 'lucide-react';
import Loading from "@/components/ui/loading";
import NavKeys from "@/constants/navkeys";
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';
import { RequirePermission } from '@/components/auth/require-permission';

const OutletConfigCreationPage = () => {
  return (
    <RequirePermission module={PERMISSIONS.OUTLET_CONFIG} action={MENU_RIGHTS.CREATE}>
      <OutletConfigCreationContent />
    </RequirePermission>
  );
};

const OutletConfigCreationContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hierarchyId = searchParams.get("hierarchyId"); // use hierarchyId instead of id
  const mode = searchParams.get("mode");
  const { getHierarchyById, createHierarchy, updateHierarchy } = useApprovalHierarchy();
  const editDataQuery = hierarchyId && mode === "edit" ? getHierarchyById(hierarchyId) : null;

  // Get recordMaps from Redux store
  const recordMaps = useAppSelector((state) => state.masterRecords.recordMaps);

  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalLevel, setModalLevel] = useState<string>("");
  const [workflow, setWorkflow] = useState<any[]>([]);
  const [editApprover, setEditApprover] = useState<{ roleId: string; mandatory: boolean } | null>(null);
  const [editApproverIndex, setEditApproverIndex] = useState<number | null>(null);

  // Populate fields and workflow in edit mode
  useEffect(() => {
    if (editDataQuery && editDataQuery.data) {
      const data = editDataQuery.data.data;
      setSelectedChannel(
        (data.metaTagFields && data.metaTagFields.channelId) || ""
      );
      setIsEditMode(true);
      if (data && data.approvers) {
        const sorted = [...data.approvers].sort((a, b) => a.level - b.level);
        const levelMap = new Map<number, number>();
        let nextLevel = 1;
        for (const approver of sorted) {
          if (!levelMap.has(approver.level)) {
            levelMap.set(approver.level, nextLevel++);
          }
        }
        setWorkflow(
          sorted.map((approver: any) => ({
            level: `Level ${levelMap.get(approver.level)}`,
            approver: approver.roleName || "",
            approverRoleId: approver.roleId,
            approvalType: approver.mandatory ? "Required" : "Optional",
            mandatory: approver.mandatory,
          }))
        );
      }
    }
  }, [editDataQuery?.data]);

  // Group workflow by level
  const groupedWorkflow = useMemo(() => {
    return workflow.reduce((acc: Record<string, typeof workflow>, item: any) => {
      if (!acc[item.level]) {
        acc[item.level] = [];
      }
      acc[item.level].push(item);
      return acc;
    }, {} as Record<string, typeof workflow>);
  }, [workflow]);

  const levels = Object.keys(groupedWorkflow).sort((a, b) => {
    const levelA = parseInt(a.replace("Level ", ""));
    const levelB = parseInt(b.replace("Level ", ""));
    return levelA - levelB;
  });

  // Add/Edit Approver Modal
  const handleAddNew = () => {
    setIsEditMode(true);
    setShowAddModal(true);
    setModalLevel(`Level 1`);
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setShowAddModal(false);
    setModalLevel("");
    router.push(NavKeys.OutletConfig);
  };

  const handleSave = async () => {
    const payload = {
      context: "outletApprovals",
      channelId: selectedChannel,
      approvers: workflow.map((item: any) => ({
        level: parseInt(item.level.replace('Level ', '')),
        mandatory: item.mandatory,
        roleId: item.approverRoleId,
      })),
    };
    try {
      if (isEditMode && hierarchyId) {
        await updateHierarchy.mutateAsync({ hierarchyId, data: payload });
      } else {
        await createHierarchy.mutateAsync(payload);
      }
      setIsEditMode(false);
      setShowAddModal(false);
      setModalLevel("");
      router.push(NavKeys.OutletConfig);
    } catch (error) {
      console.error("Failed to save outlet hierarchy:", error);
    }
  };

  const handleAddApprover = (level: string, isAddLevel = false) => {
    const currentLevelNum = parseInt(level.replace("Level ", ""));
    setShowAddModal(true);
    setModalLevel(`Level ${currentLevelNum}`);
  };

  const handleEditApprover = (level: string, approverRoleId: string) => {
    const approver = groupedWorkflow[level].find((a: any) => a.approverRoleId === approverRoleId);
    if (approver) {
      setEditApprover({ roleId: approver.approverRoleId, mandatory: approver.mandatory });
      setEditApproverIndex(
        workflow.findIndex((a) => a.level === level && a.approverRoleId === approverRoleId)
      );
      setShowAddModal(true);
      setModalLevel(level);
    }
  };

  const handleSaveApprover = (approverData: { roleId: string; mandatory: boolean }) => {
    if (editApprover && editApproverIndex !== null) {
      // Edit mode: update existing approver
      setWorkflow((prev) => {
        const updated = [...prev];
        updated[editApproverIndex] = {
          ...updated[editApproverIndex],
          approverRoleId: approverData.roleId,
          mandatory: approverData.mandatory,
          approvalType: approverData.mandatory ? 'Required' : 'Optional',
          approver:
            recordMaps.role && recordMaps.role[approverData.roleId]
              ? recordMaps.role[approverData.roleId].roleName || ''
              : '',
        };
        return updated;
      });
      setEditApprover(null);
      setEditApproverIndex(null);
      setShowAddModal(false);
      setModalLevel('');
    } else {
      // Add mode: add new approver
      setWorkflow((prev) => {
        const level = modalLevel;
        const levelNum = parseInt(level.replace('Level ', ''));
        const hasLevel = prev.some((item) => item.level === `Level ${levelNum}`);
        let newWorkflow = prev;
        if (!hasLevel) {
          newWorkflow = prev.map((item) => {
            const itemLevelNum = parseInt(item.level.replace('Level ', ''));
            return itemLevelNum >= levelNum
              ? { ...item, level: `Level ${itemLevelNum + 1}` }
              : item;
          });
        }
        let roleName = '';
        if (recordMaps.role && recordMaps.role[approverData.roleId]) {
          roleName = recordMaps.role[approverData.roleId].roleName || '';
        }
        const newApprover = {
          level: `Level ${levelNum}`,
          approver: roleName,
          approverRoleId: approverData.roleId,
          approvalType: approverData.mandatory ? 'Required' : 'Optional',
          mandatory: approverData.mandatory,
        };
        return [...newWorkflow, newApprover].sort(
          (a, b) => parseInt(a.level.replace('Level ', '')) - parseInt(b.level.replace('Level ', ''))
        );
      });
      setShowAddModal(false);
      setModalLevel('');
    }
  };

  useEffect(() => {
    if (!isEditMode) setWorkflow([]);
  }, [isEditMode]);

  const handleDeleteApprover = (level: string, approverRoleId: string) => {
    setWorkflow((prev) => {
      const levelNum = parseInt(level.replace("Level ", ""));
      let newWorkflow = prev.filter(
        (item) => !(item.level === level && item.approverRoleId === approverRoleId)
      );
      const hasLevel = newWorkflow.some((item) => item.level === level);
      if (!hasLevel) {
        newWorkflow = newWorkflow.map((item) => {
          const itemLevelNum = parseInt(item.level.replace("Level ", ""));
          return itemLevelNum > levelNum
            ? { ...item, level: `Level ${itemLevelNum - 1}` }
            : item;
        });
      }
      return newWorkflow;
    });
  };

  // For loading and workflow display
  const isLoading = false; // Replace with actual loading state if available
  const filteredWorkflow = workflow;

  return (
    <section className="w-full space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link
          href={NavKeys.OutletConfig}
          className="hover:bg-freshleaf/30 rounded-lg bg-neutral-200 p-2 text-neutral-500"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div className="flex flex-col">
          <h1 className="text-xl font-medium">Outlet Hierarchy Configuration</h1>
        </div>
      </div>
      <div className="w-full space-y-3 rounded-lg bg-white p-4">
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div className="flex flex-col gap-2 md:flex-row">
            <MasterRecordDropdown
              masterName="channel"
              value={selectedChannel}
              onChange={setSelectedChannel}
              placeholder="Select Channel"
              disabled={isEditMode}
            />
          </div>
          <div className="flex items-center gap-2">
            {!isEditMode ? (
              <Button
                onClick={handleAddNew}
                disabled={!selectedChannel || selectedChannel === "all"}
              >
                {workflow.length > 0 ? "Edit Configuration" : "Create Configuration"}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button onClick={handleSave}>Save Changes</Button>
                <Button variant="outline" onClick={handleCancel}>Cancel</Button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="w-full">
        {/* Show loading spinner in edit mode until API is completed */}
        {mode === 'edit' && editDataQuery && editDataQuery.isLoading ? (
          <div className="h-80 flex items-center justify-center">
            <Loading text="Loading outlet hierarchy..." />
          </div>
        ) : (
          selectedChannel && selectedChannel !== 'all' ? (
            filteredWorkflow.length > 0 ? (
              <div className="">
                {levels.map((level, levelIndex) => (
                  <div key={level} className="">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3 min-w-fit">
                        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 rounded-xl">
                          <span className="text-xs font-semibold text-gray-700">
                            {level.replace('Level ', 'L')}
                          </span>
                        </div>
                        <div className="hidden sm:block">
                          <div className="text-sm font-medium text-gray-900">{level}</div>
                          <div className="text-xs text-gray-500">Approval Stage</div>
                        </div>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="overflow-x-auto pb-3">
                          <div className="flex justify-center gap-4 max-w-full">
                            {groupedWorkflow[level].map((approver: any, index: number) => (
                              <div
                                key={`${approver.approverRoleId}-${index}`}
                                className="flex-shrink-0 group relative"
                              >
                                <div className="w-64 bg-gradient-to-br from-white to-gray-50/30 border border-gray-200/60 rounded-2xl p-5 hover:border-gray-300/60 transition-all duration-300 backdrop-blur-sm">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-gray-900 mb-2 truncate pr-2">
                                        {approver.approver}
                                      </h4>
                                      <div className="inline-flex items-center">
                                        <span
                                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                            approver.mandatory
                                              ? 'bg-red-50 text-red-700 border-red-200'
                                              : 'bg-blue-50 text-blue-700 border-blue-200'
                                          }`}
                                        >
                                          {approver.approvalType}
                                        </span>
                                      </div>
                                    </div>
                                    {isEditMode && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon">
                                            <MoreVertical className="h-5 w-5" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40 border-gray-200 shadow-lg">
                                          <DropdownMenuItem onClick={() => handleEditApprover(level, approver.approverRoleId)}>Edit</DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleDeleteApprover(level, approver.approverRoleId)}>Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {isEditMode && (
                              <div className="flex-shrink-0 flex items-center">
                                <Button
                                  variant="outline"
                                  onClick={() => handleAddApprover(level)}
                                  className="h-12 w-12 border-2 border-dashed border-gray-300 hover:border-freshleaf hover:bg-freshleaf/5 transition-all duration-200 rounded-full group p-0"
                                >
                                  <PlusIcon className="h-5 w-5 group-hover:text-freshleaf transition-colors" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {levelIndex < levels.length - 1 && (
                      <div className="flex items-center justify-center py-8">
                        {isEditMode ? (
                          <div className="flex items-center justify-center w-full max-w-4xl">
                            <div className="flex-1 border-t-2 border-dashed border-gray-400"></div>
                            <Button
                              variant="outline"
                              onClick={() => handleAddApprover(`Level ${parseInt(level.replace('Level ', '')) + 1}`, true)}
                              className="h-10 px-4 mx-4 border-2 border-dashed border-gray-300 hover:border-freshleaf hover:bg-freshleaf/5 hover:text-freshleaf transition-all duration-200 rounded-xl group bg-white"
                            >
                              <PlusIcon className="mr-2 h-3 w-3 group-hover:scale-110 transition-transform" />
                              Add Level
                            </Button>
                            <div className="flex-1 border-t-2 border-dashed border-gray-400"></div>
                          </div>
                        ) : (
                          <div className="w-full max-w-4xl border-t-2 border-dashed border-gray-400"></div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {isEditMode && levels.length > 0 && (
                  <div className="flex items-center justify-center py-8">
                    <Button
                      variant="outline"
                      onClick={() => handleAddApprover(`Level ${levels.length + 1}`)}
                      className="h-10 px-4 border-2 border-dashed border-gray-300 hover:border-freshleaf hover:bg-freshleaf/5 hover:text-freshleaf transition-all duration-200 rounded-xl group bg-white"
                    >
                      <PlusIcon className="mr-2 h-3 w-3 group-hover:scale-110 transition-transform" />
                      Add Level
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                    <Settings className="h-10 w-10 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Configuration Found
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      No outlet hierarchy configuration found for the selected channel.
                    </p>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="h-80 flex items-center justify-center">
              <div className="text-center space-y-4 max-w-md">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <Settings className="h-10 w-10 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Configuration Selected
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Choose a channel from the dropdown above to view and configure the outlet workflow.
                  </p>
                </div>
              </div>
            </div>
          )
        )}
        {isEditMode && (
          <ClaimHierarchyCardAdd
            open={showAddModal}
            onClose={() => {
              setShowAddModal(false);
              setEditApprover(null);
              setEditApproverIndex(null);
            }}
            onSave={handleSaveApprover}
            level={modalLevel}
            roles={[]}
            editApprover={editApprover}
          />
        )}
      </div>
    </section>
  );
};

export default OutletConfigCreationPage;
