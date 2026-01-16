import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ExportData {
  gymName?: string;
  activeRange: string;
  rangeRevenue: number;
  rangeExpenses: number;
  rangeProfit: number;
  totalCheckIns: number;
  attendanceRate: number;
  newMembersInPeriod: number;
  activeMembers: number;
  totalMembers: number;
  retentionRate: number;
  avgTransactionValue: number;
  filteredPaymentsCount: number;
  revenueChartData: Array<{ month: string; revenue: number; expenses: number; profit: number }>;
  membershipData: Array<{ name: string; value: number }>;
  memberStatusData: Array<{ name: string; value: number }>;
  expenseCategoryData: Array<{ name: string; value: number }>;
  paymentModeData: Array<{ name: string; value: number; count: number }>;
  attendanceChartData: Array<{ day: string; checkIns: number }>;
}

export function useAnalyticsExport() {
  const exportToCSV = (data: ExportData) => {
    const currentDate = format(new Date(), "yyyy-MM-dd");
    const lines: string[] = [];

    // Header
    lines.push(`Analytics Report - ${data.activeRange}`);
    lines.push(`Generated: ${format(new Date(), "PPpp")}`);
    lines.push("");

    // Summary Stats
    lines.push("=== SUMMARY STATISTICS ===");
    lines.push(`Total Revenue,₹${data.rangeRevenue.toLocaleString()}`);
    lines.push(`Net Profit,₹${data.rangeProfit.toLocaleString()}`);
    lines.push(`Total Expenses,₹${data.rangeExpenses.toLocaleString()}`);
    lines.push(`Total Check-ins,${data.totalCheckIns}`);
    lines.push(`Attendance Rate,${data.attendanceRate}%`);
    lines.push(`New Members,${data.newMembersInPeriod}`);
    lines.push(`Active Members,${data.activeMembers}`);
    lines.push(`Total Members,${data.totalMembers}`);
    lines.push(`Retention Rate,${data.retentionRate}%`);
    lines.push(`Avg Transaction,₹${data.avgTransactionValue.toLocaleString()}`);
    lines.push(`Total Payments,${data.filteredPaymentsCount}`);
    lines.push("");

    // Revenue Chart Data
    lines.push("=== REVENUE ANALYSIS ===");
    lines.push("Period,Revenue,Expenses,Profit");
    data.revenueChartData.forEach((row) => {
      lines.push(`${row.month},${row.revenue},${row.expenses},${row.profit}`);
    });
    lines.push("");

    // Membership Plans
    lines.push("=== MEMBERSHIP PLANS ===");
    lines.push("Plan,Members");
    data.membershipData.forEach((row) => {
      lines.push(`${row.name},${row.value}`);
    });
    lines.push("");

    // Member Status
    lines.push("=== MEMBER STATUS ===");
    lines.push("Status,Count");
    data.memberStatusData.forEach((row) => {
      lines.push(`${row.name},${row.value}`);
    });
    lines.push("");

    // Expense Categories
    if (data.expenseCategoryData.length > 0) {
      lines.push("=== EXPENSE BREAKDOWN ===");
      lines.push("Category,Amount");
      data.expenseCategoryData.forEach((row) => {
        lines.push(`${row.name},₹${row.value.toLocaleString()}`);
      });
      lines.push("");
    }

    // Payment Modes
    if (data.paymentModeData.length > 0) {
      lines.push("=== PAYMENT METHODS ===");
      lines.push("Method,Amount,Count");
      data.paymentModeData.forEach((row) => {
        lines.push(`${row.name},₹${row.value.toLocaleString()},${row.count}`);
      });
      lines.push("");
    }

    // Attendance Data
    lines.push("=== ATTENDANCE TREND ===");
    lines.push("Day,Check-ins");
    data.attendanceChartData.forEach((row) => {
      lines.push(`${row.day},${row.checkIns}`);
    });

    const csvContent = lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `analytics-report-${currentDate}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportToPDF = (data: ExportData) => {
    const currentDate = format(new Date(), "yyyy-MM-dd");
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text("Analytics Report", 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Period: ${data.activeRange}`, 14, 30);
    doc.text(`Generated: ${format(new Date(), "PPpp")}`, 14, 36);

    // Summary Stats Table
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text("Summary Statistics", 14, 48);

    autoTable(doc, {
      startY: 52,
      head: [["Metric", "Value"]],
      body: [
        ["Total Revenue", `₹${data.rangeRevenue.toLocaleString()}`],
        ["Net Profit", `₹${data.rangeProfit.toLocaleString()}`],
        ["Total Expenses", `₹${data.rangeExpenses.toLocaleString()}`],
        ["Total Check-ins", data.totalCheckIns.toString()],
        ["Attendance Rate", `${data.attendanceRate}%`],
        ["New Members", data.newMembersInPeriod.toString()],
        ["Active Members", data.activeMembers.toString()],
        ["Total Members", data.totalMembers.toString()],
        ["Retention Rate", `${data.retentionRate}%`],
        ["Avg Transaction", `₹${data.avgTransactionValue.toLocaleString()}`],
      ],
      theme: "striped",
      headStyles: { fillColor: [20, 184, 166] },
      styles: { fontSize: 10 },
    });

    // Revenue Analysis Table
    const revenueY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text("Revenue Analysis", 14, revenueY);

    autoTable(doc, {
      startY: revenueY + 4,
      head: [["Period", "Revenue", "Expenses", "Profit"]],
      body: data.revenueChartData.map((row) => [
        row.month,
        `₹${row.revenue.toLocaleString()}`,
        `₹${row.expenses.toLocaleString()}`,
        `₹${row.profit.toLocaleString()}`,
      ]),
      theme: "striped",
      headStyles: { fillColor: [20, 184, 166] },
      styles: { fontSize: 9 },
    });

    // Membership Plans
    const membershipY = (doc as any).lastAutoTable.finalY + 10;
    
    // Check if we need a new page
    if (membershipY > 250) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text("Membership Plans", 14, 20);
      autoTable(doc, {
        startY: 24,
        head: [["Plan", "Members"]],
        body: data.membershipData.map((row) => [row.name, row.value.toString()]),
        theme: "striped",
        headStyles: { fillColor: [20, 184, 166] },
        styles: { fontSize: 10 },
      });
    } else {
      doc.setFontSize(14);
      doc.text("Membership Plans", 14, membershipY);
      autoTable(doc, {
        startY: membershipY + 4,
        head: [["Plan", "Members"]],
        body: data.membershipData.map((row) => [row.name, row.value.toString()]),
        theme: "striped",
        headStyles: { fillColor: [20, 184, 166] },
        styles: { fontSize: 10 },
      });
    }

    // Member Status
    const statusY = (doc as any).lastAutoTable.finalY + 10;
    
    if (statusY > 250) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text("Member Status", 14, 20);
      autoTable(doc, {
        startY: 24,
        head: [["Status", "Count"]],
        body: data.memberStatusData.map((row) => [row.name, row.value.toString()]),
        theme: "striped",
        headStyles: { fillColor: [20, 184, 166] },
        styles: { fontSize: 10 },
      });
    } else {
      doc.setFontSize(14);
      doc.text("Member Status", 14, statusY);
      autoTable(doc, {
        startY: statusY + 4,
        head: [["Status", "Count"]],
        body: data.memberStatusData.map((row) => [row.name, row.value.toString()]),
        theme: "striped",
        headStyles: { fillColor: [20, 184, 166] },
        styles: { fontSize: 10 },
      });
    }

    // Expense Breakdown (if available)
    if (data.expenseCategoryData.length > 0) {
      const expenseY = (doc as any).lastAutoTable.finalY + 10;
      
      if (expenseY > 250) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text("Expense Breakdown", 14, 20);
        autoTable(doc, {
          startY: 24,
          head: [["Category", "Amount"]],
          body: data.expenseCategoryData.map((row) => [row.name, `₹${row.value.toLocaleString()}`]),
          theme: "striped",
          headStyles: { fillColor: [20, 184, 166] },
          styles: { fontSize: 10 },
        });
      } else {
        doc.setFontSize(14);
        doc.text("Expense Breakdown", 14, expenseY);
        autoTable(doc, {
          startY: expenseY + 4,
          head: [["Category", "Amount"]],
          body: data.expenseCategoryData.map((row) => [row.name, `₹${row.value.toLocaleString()}`]),
          theme: "striped",
          headStyles: { fillColor: [20, 184, 166] },
          styles: { fontSize: 10 },
        });
      }
    }

    // Payment Methods (if available)
    if (data.paymentModeData.length > 0) {
      const paymentY = (doc as any).lastAutoTable.finalY + 10;
      
      if (paymentY > 250) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text("Payment Methods", 14, 20);
        autoTable(doc, {
          startY: 24,
          head: [["Method", "Amount", "Count"]],
          body: data.paymentModeData.map((row) => [
            row.name,
            `₹${row.value.toLocaleString()}`,
            row.count.toString(),
          ]),
          theme: "striped",
          headStyles: { fillColor: [20, 184, 166] },
          styles: { fontSize: 10 },
        });
      } else {
        doc.setFontSize(14);
        doc.text("Payment Methods", 14, paymentY);
        autoTable(doc, {
          startY: paymentY + 4,
          head: [["Method", "Amount", "Count"]],
          body: data.paymentModeData.map((row) => [
            row.name,
            `₹${row.value.toLocaleString()}`,
            row.count.toString(),
          ]),
          theme: "striped",
          headStyles: { fillColor: [20, 184, 166] },
          styles: { fontSize: 10 },
        });
      }
    }

    // Save PDF
    doc.save(`analytics-report-${currentDate}.pdf`);
  };

  return { exportToCSV, exportToPDF };
}
