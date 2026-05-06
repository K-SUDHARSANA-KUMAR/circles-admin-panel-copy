'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PlusIcon, Settings, MoreVertical, ArrowLeftIcon } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { usePermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { RequirePermission } from '@/components/auth/require-permission';
import { MasterRecordDropdown } from '@/components/shared/master-record-dropdown-filter';
import { useApprovalHierarchy } from '@/features/config-management/claims-config/approval-hierarchy/hooks/useApprovalHierarchy';
import ClaimHierarchyCardAdd from '@/components/modals/claim-config/claim-hierarchy-card-add';
import { useSearchParams } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NavKeys from '@/constants/navkeys';

const ApprovalHierarchyCreationPage = () => {
  return (
    <RequirePermission module="claims-config">
      <ApprovalHierarchyContent />
    </RequirePermission>
  );
};

const ApprovalHierarchyContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const mode = searchParams.get('mode');
  const { getHierarchyById, hierarchies, updateHierarchy, createHierarchy } = useApprovalHierarchy();
  const editDataQuery = id && mode === 'edit' ? getHierarchyById(id) : null;

  const configPermission = usePermissionChecker('claims-config');
  const hasCreatePermission = configPermission.has('create');
  
  // Fix: Get recordMaps from Redux store
  const recordMaps = useAppSelector((state) => state.masterRecords.recordMaps);

  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalLevel, setModalLevel] = useState<string>('');

  // Local workflow state for both creation and edit mode
  const [workflow, setWorkflow] = useState<any[]>([]);

  // If in edit mode and data is loaded, populate fields and workflow
  useEffect(() => {
    if (editDataQuery && editDataQuery.data) {
      const data = editDataQuery.data.data;
      setSelectedRole(data.roleId || '');
      setSelectedType(data.claimTypeId || '');
      setIsEditMode(true);
      // Initialize workflow with API data and normalize levels
      if (data && data.approvers) {
        // Sort by level
        const sorted = [...data.approvers].sort((a, b) => a.level - b.level);
        // Map old levels to new contiguous levels
        const levelMap = new Map<number, number>();
        let nextLevel = 1;
        for (const approver of sorted) {
          if (!levelMap.has(approver.level)) {
            levelMap.set(approver.level, nextLevel++);
          }
        }
        setWorkflow(sorted.map((approver: any) => ({
          category: data.claimType?.claimName || '',
          level: `Level ${levelMap.get(approver.level)}`,
          approver: approver.role?.roleName || '',
          approverRoleId: approver.roleId,
          approvalType: approver.mandatory ? 'Required' : 'Optional',
          mandatory: approver.mandatory
        })));
      }
    }
  }, [editDataQuery?.data]);

  // Filter and transform API data based on selected role and claim type
  const filteredWorkflow = workflow;

  // Group workflow by level
  const groupedWorkflow = useMemo(() => {
    return filteredWorkflow.reduce((acc: Record<string, typeof filteredWorkflow>, item:any) => {
      if (!acc[item.level]) {
        acc[item.level] = [];
      }
      acc[item.level].push(item);
      return acc;
    }, {} as Record<string, typeof filteredWorkflow>);
  }, [filteredWorkflow]);

  const levels = Object.keys(groupedWorkflow).sort((a, b) => {
    const levelA = parseInt(a.replace('Level ', ''));
    const levelB = parseInt(b.replace('Level ', ''));
    return levelA - levelB;
  });

  // Add this function to handle the 'Create/Edit Configuration' button
  const handleAddNew = () => {
    setIsEditMode(true);
    setShowAddModal(true);
    setModalLevel(`Level 1`); // or set to the next level as needed
  };

  // Add this function to handle the 'Cancel' button
  const handleCancel = () => {
    setIsEditMode(false);
    setShowAddModal(false);
    setModalLevel('');
    router.push(NavKeys.ClaimConfigApprovalHierarchy);
  };

  // Add this function to handle the 'Save Changes' button
  const handleSave = async () => {
    const payload = {
      claimTypeId: selectedType,
      roleId: selectedRole,
      approvers: workflow.map((item: any) => ({
        level: parseInt(item.level.replace('Level ', '')),
        mandatory: item.mandatory,
        roleId: item.approverRoleId
      }))
    };
    try {
      if (isEditMode && id) {
        await updateHierarchy.mutateAsync({ hierarchyId: id, data: payload });
      } else {
        await createHierarchy.mutateAsync(payload);
      }
      setIsEditMode(false);
      setShowAddModal(false);
      setModalLevel('');
      router.push(NavKeys.ClaimConfigApprovalHierarchy);
      // Optionally, show a success message or refresh data
    } catch (error) {
      console.error('Failed to save approval hierarchy:', error);
    }
  };

  // Add this function to handle opening the modal for adding an approver at a specific level
  const handleAddApprover = (level: string, isAddLevel = false) => {
    if (isAddLevel) {
      // Only open the modal for the new level, do not shift levels yet
      const currentLevelNum = parseInt(level.replace('Level ', ''));
      setShowAddModal(true);
      setModalLevel(`Level ${currentLevelNum}`); // Open modal for the new level
    } else {
      setShowAddModal(true);
      setModalLevel(level);
    }
  };

  // Add this function to handle saving an approver from the modal
  const handleSaveApprover = (approverData: any) => {
    setWorkflow(prev => {
      const level = modalLevel;
      const levelNum = parseInt(level.replace('Level ', ''));
      // If this is a new level (no approvers at this level), shift all higher levels up by 1
      const hasLevel = prev.some(item => item.level === `Level ${levelNum}`);
      let newWorkflow = prev;
      if (!hasLevel) {
        newWorkflow = prev.map(item => {
          const itemLevelNum = parseInt(item.level.replace('Level ', ''));
          return itemLevelNum >= levelNum
            ? { ...item, level: `Level ${itemLevelNum + 1}` }
            : item;
        });
      }
      // Resolve role name from Redux recordMaps
      let roleName = '';
      if (recordMaps.role && recordMaps.role[approverData.roleId]) {
        roleName = recordMaps.role[approverData.roleId].roleName || '';
      }
      // Add the new approver at the correct level
      const newApprover = {
        level: `Level ${levelNum}`,
        approver: roleName,
        approverRoleId: approverData.roleId,
        approvalType: approverData.mandatory ? 'Required' : 'Optional',
        mandatory: approverData.mandatory
      };
      return [...newWorkflow, newApprover].sort((a, b) => parseInt(a.level.replace('Level ', '')) - parseInt(b.level.replace('Level ', '')));
    });
    setShowAddModal(false);
    setModalLevel('');
  };

  // Reset workflow state after save or cancel
  useEffect(() => {
    if (!isEditMode) setWorkflow([]);
  }, [isEditMode]);

  // Delete an approver card and update levels accordingly
  const handleDeleteApprover = (level: string, approverRoleId: string) => {
    setWorkflow(prev => {
      const levelNum = parseInt(level.replace('Level ', ''));
      // Remove the approver from the specified level
      let newWorkflow = prev.filter(item => !(item.level === level && item.approverRoleId === approverRoleId));
      // Check if any approvers remain at this level
      const hasLevel = newWorkflow.some(item => item.level === level);
      if (!hasLevel) {
        // Remove the level and shift all higher levels down by 1
        newWorkflow = newWorkflow.map(item => {
          const itemLevelNum = parseInt(item.level.replace('Level ', ''));
          return itemLevelNum > levelNum
            ? { ...item, level: `Level ${itemLevelNum - 1}` }
            : item;
        });
      }
      return newWorkflow;
    });
  };

  return (
    <section className="w-full space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link
          href={NavKeys.ClaimConfigApprovalHierarchy}
          className="hover:bg-freshleaf/30 rounded-lg bg-neutral-200 p-2 text-neutral-500"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div className="flex flex-col">
          <h1 className="text-xl font-medium">Claims Configuration</h1>
        </div>
      </div>

      <div className="w-full space-y-3 rounded-lg bg-white p-4">
        
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div className="flex flex-col gap-2 md:flex-row">
            <MasterRecordDropdown
              masterName="role"
              value={selectedRole}
              onChange={setSelectedRole}
              placeholder="Select Role"
            />
            <MasterRecordDropdown
              masterName="claimType"
              value={selectedType}
              onChange={setSelectedType}
              placeholder="Select Type"
            />
          </div>
          <div className="flex items-center gap-2">
            {!isEditMode ? (
              hasCreatePermission && (
                <Button 
                  onClick={handleAddNew}
                  disabled={!selectedType || selectedType === 'all' || !selectedRole}
                >
                  {filteredWorkflow.length > 0 ? 'Edit Configuration' : 'Create Configuration'}
                </Button>
              )
            ) : (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full">
        {hierarchies?.isLoading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-500">Loading approval hierarchy...</p>
            </div>
          </div>
        ) : selectedType && selectedType !== 'all' && selectedRole ? (
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
                                        <DropdownMenuItem>Edit</DropdownMenuItem>
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
                    No approval hierarchy configuration found for the selected role and claim type.
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
                  Choose a role and claim type from the dropdowns above to view and configure the approval workflow.
                </p>
              </div>
            </div>
          </div>
        )}
        {isEditMode && (
          <ClaimHierarchyCardAdd
            open={showAddModal}
            onClose={() => setShowAddModal(false)}
            onSave={handleSaveApprover}
            level={modalLevel}
            roles={[]}
          />
        )}
      </div>
    </section>
  );
};

export default ApprovalHierarchyCreationPage;
