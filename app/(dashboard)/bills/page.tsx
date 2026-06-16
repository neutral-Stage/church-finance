'use client'

import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import {
  Plus,
  FileText,
  CreditCard,
  AlertTriangle,
  Clock,
  Receipt,
  CheckCircle,
} from 'lucide-react'
import { BillFormDialog } from '@/components/bills/bill-form-dialog'
import { BillsList } from '@/components/bills/bills-list'
import { BillsPettyCashTab } from '@/components/bills/bills-petty-cash-tab'
import { BillsSummaryCard } from '@/components/bills/bills-summary-card'
import { useBillsPage } from '@/components/bills/use-bills-page'

export default function BillsPage(): JSX.Element {
  const {
    bills,
    ledgerEntries,
    ledgerSubgroups,
    pettyCash,
    funds,
    loading,
    activeTab,
    setActiveTab,
    expandedEntries,
    expandedSubgroups,
    billDialogOpen,
    setBillDialogOpen,
    pettyCashDialogOpen,
    setPettyCashDialogOpen,
    editingBill,
    editingPettyCash,
    billForm,
    setBillForm,
    pettyCashForm,
    setPettyCashForm,
    toggleEntryExpansion,
    toggleSubgroupExpansion,
    groupedBills,
    handleSaveBill,
    handlePettyCashSubmit,
    updateBillStatus,
    deleteBill,
    deletePettyCash,
    openBillDialog,
    openPettyCashDialog,
    isOverdue,
    canManage,
    overdueBills,
    pendingBills,
    totalBillsAmount,
    totalPettyCashAmount,
  } = useBillsPage()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-32 w-32 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-lg text-foreground">Loading bills and petty cash...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto space-y-6 p-6">
        <div className="animate-fade-in animate-slide-in-from-bottom-4 mb-12 rounded-2xl border border-border bg-card p-8 shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <h1 className="mb-3 text-4xl font-bold tracking-tight text-foreground">
                Bills & Petty Cash
              </h1>
              <p className="text-lg font-medium text-muted-foreground">
                Manage bills and petty cash requests
              </p>
            </div>
            {canManage && (
              <div className="flex flex-shrink-0 gap-4">
                <BillFormDialog
                  open={billDialogOpen}
                  onOpenChange={setBillDialogOpen}
                  editingBill={editingBill}
                  billForm={billForm}
                  onBillFormChange={setBillForm}
                  funds={funds}
                  ledgerEntries={ledgerEntries}
                  ledgerSubgroups={ledgerSubgroups}
                  onSubmit={handleSaveBill}
                  trigger={
                    <Button
                      className="px-6 py-3 text-base font-semibold shadow-xl"
                      onClick={() => openBillDialog()}
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      Add Bill
                    </Button>
                  }
                />
                <BillsPettyCashTab
                  pettyCash={pettyCash}
                  canManage={canManage}
                  pettyCashDialogOpen={pettyCashDialogOpen}
                  onPettyCashDialogOpenChange={setPettyCashDialogOpen}
                  editingPettyCash={editingPettyCash}
                  pettyCashForm={pettyCashForm}
                  onPettyCashFormChange={setPettyCashForm}
                  onPettyCashSubmit={handlePettyCashSubmit}
                  onEditPettyCash={openPettyCashDialog}
                  onDeletePettyCash={deletePettyCash}
                  renderMode="dialog"
                  dialogTrigger={
                    <Button
                      variant="secondary"
                      className="px-6 py-3 text-base font-semibold shadow-xl"
                      onClick={() => openPettyCashDialog()}
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      Petty Cash
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <BillsSummaryCard
            title="Overdue Bills"
            value={overdueBills.length}
            subtitle={`${formatCurrency(overdueBills.reduce((sum, bill) => sum + bill.amount, 0))} total`}
            icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
            iconClassName="bg-destructive/15"
            delay="100ms"
          />
          <BillsSummaryCard
            title="Pending Bills"
            value={pendingBills.length}
            subtitle={`${formatCurrency(totalBillsAmount)} total amount`}
            icon={<Clock className="h-4 w-4 text-pending" />}
            iconClassName="bg-pending/15"
            delay="200ms"
          />
          <BillsSummaryCard
            title="Pending Petty Cash"
            value={pettyCash.length}
            subtitle={`${formatCurrency(pettyCash.reduce((sum, pc) => sum + pc.amount, 0))} requested`}
            icon={<Receipt className="h-4 w-4 text-primary" />}
            iconClassName="bg-primary/15"
            delay="300ms"
          />
          <BillsSummaryCard
            title="Approved Petty Cash"
            value={0}
            displayValue={formatCurrency(totalPettyCashAmount)}
            subtitle="Ready for disbursement"
            icon={<CheckCircle className="h-4 w-4 text-income" />}
            iconClassName="bg-income/15"
            delay="400ms"
          />
        </div>

        <div className="animate-in fade-in-0 slide-in-from-bottom-4 flex w-fit space-x-1 rounded-xl border border-border bg-muted p-2 shadow-lg duration-700">
          <button
            onClick={() => setActiveTab('bills')}
            className={`rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-300 ${
              activeTab === 'bills'
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            <FileText className="mr-2 inline h-4 w-4" />
            Bills ({bills.length})
          </button>
          <button
            onClick={() => setActiveTab('petty-cash')}
            className={`rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-300 ${
              activeTab === 'petty-cash'
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            <CreditCard className="mr-2 inline h-4 w-4" />
            Petty Cash ({pettyCash.length})
          </button>
        </div>

        {activeTab === 'bills' && (
          <BillsList
            bills={bills}
            groupedBills={groupedBills()}
            expandedEntries={expandedEntries}
            expandedSubgroups={expandedSubgroups}
            onToggleEntry={toggleEntryExpansion}
            onToggleSubgroup={toggleSubgroupExpansion}
            isOverdue={isOverdue}
            canManage={canManage}
            onEditBill={openBillDialog}
            onUpdateBillStatus={updateBillStatus}
            onDeleteBill={deleteBill}
          />
        )}

        {activeTab === 'petty-cash' && (
          <BillsPettyCashTab
            pettyCash={pettyCash}
            canManage={canManage}
            pettyCashDialogOpen={pettyCashDialogOpen}
            onPettyCashDialogOpenChange={setPettyCashDialogOpen}
            editingPettyCash={editingPettyCash}
            pettyCashForm={pettyCashForm}
            onPettyCashFormChange={setPettyCashForm}
            onPettyCashSubmit={handlePettyCashSubmit}
            onEditPettyCash={openPettyCashDialog}
            onDeletePettyCash={deletePettyCash}
            renderMode="content"
          />
        )}
      </div>
    </div>
  )
}
