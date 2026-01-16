import { format } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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

  const exportToPDF = async (_data: ExportData) => {
    const currentDate = format(new Date(), "yyyy-MM-dd");
    
    // Get the main analytics content container
    const analyticsContent = document.querySelector("main");
    if (!analyticsContent) {
      throw new Error("Could not find analytics content");
    }

    // Create a clone to modify for export
    const clone = analyticsContent.cloneNode(true) as HTMLElement;
    
    // Style the clone for better PDF output
    clone.style.width = "1200px";
    clone.style.padding = "20px";
    clone.style.backgroundColor = "#ffffff";
    clone.style.color = "#1a1a1a";
    
    // Force light theme colors on clone
    clone.querySelectorAll("*").forEach((el) => {
      const element = el as HTMLElement;
      const computedStyle = window.getComputedStyle(element);
      
      // Convert any dark backgrounds to light
      if (computedStyle.backgroundColor && computedStyle.backgroundColor !== "rgba(0, 0, 0, 0)") {
        const bgColor = computedStyle.backgroundColor;
        if (bgColor.includes("rgb(") || bgColor.includes("rgba(")) {
          // Keep the background but ensure it's visible
          element.style.backgroundColor = bgColor;
        }
      }
    });

    // Temporarily add clone to document for rendering
    clone.style.position = "absolute";
    clone.style.left = "-9999px";
    clone.style.top = "0";
    document.body.appendChild(clone);

    try {
      // Capture the clone as canvas
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: 1200,
        windowWidth: 1200,
      });

      // Calculate PDF dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const doc = new jsPDF("p", "mm", "a4");
      
      // Add header
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text("Analytics Report", 14, 15);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${format(new Date(), "PPpp")}`, 14, 22);
      
      // Add the screenshot
      const imgData = canvas.toDataURL("image/png");
      
      // Calculate how many pages we need
      let heightLeft = imgHeight;
      let position = 30; // Start after header
      
      // Add first page
      const firstPageHeight = pageHeight - position;
      doc.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= firstPageHeight;
      
      // Add subsequent pages if needed
      while (heightLeft > 0) {
        doc.addPage();
        position = -(pageHeight - 30 - heightLeft);
        doc.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      doc.save(`analytics-report-${currentDate}.pdf`);
    } finally {
      // Clean up
      document.body.removeChild(clone);
    }
  };

  return { exportToCSV, exportToPDF };
}

