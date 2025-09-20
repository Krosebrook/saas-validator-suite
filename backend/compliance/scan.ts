import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface ScanComplianceRequest {
  idea_id: number;
}

interface ComplianceResult {
  gdpr_compliant: boolean;
  hipaa_compliant: boolean;
  pci_compliant: boolean;
  risk_level: "low" | "medium" | "high";
  compliance_notes: string;
  recommendations: string[];
}

// Scans an idea for compliance with GDPR, HIPAA, PCI-DSS
export const scan = api<ScanComplianceRequest, ComplianceResult>(
  { auth: true, expose: true, method: "POST", path: "/compliance/scan" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Get user and idea
    const user = await db.queryRow`
      SELECT id FROM users WHERE clerk_id = ${auth.userID}
    `;
    
    if (!user) {
      throw new Error("User not found");
    }

    const idea = await db.queryRow`
      SELECT * FROM ideas 
      WHERE id = ${req.idea_id} AND user_id = ${user.id}
    `;

    if (!idea) {
      throw new Error("Idea not found");
    }

    // Perform compliance analysis based on idea content
    const result = analyzeCompliance(idea);

    // Store compliance scan results
    await db.exec`
      INSERT INTO compliance_scans (
        idea_id, gdpr_compliant, hipaa_compliant, pci_compliant,
        compliance_notes, risk_level, recommendations
      ) VALUES (
        ${req.idea_id}, ${result.gdpr_compliant}, ${result.hipaa_compliant},
        ${result.pci_compliant}, ${result.compliance_notes}, ${result.risk_level},
        ${JSON.stringify(result.recommendations)}
      )
      ON CONFLICT (idea_id) DO UPDATE SET
        gdpr_compliant = EXCLUDED.gdpr_compliant,
        hipaa_compliant = EXCLUDED.hipaa_compliant,
        pci_compliant = EXCLUDED.pci_compliant,
        compliance_notes = EXCLUDED.compliance_notes,
        risk_level = EXCLUDED.risk_level,
        recommendations = EXCLUDED.recommendations
    `;

    return result;
  }
);

function analyzeCompliance(idea: any): ComplianceResult {
  const title = idea.title.toLowerCase();
  const description = (idea.description || "").toLowerCase();
  const content = `${title} ${description}`;

  // GDPR compliance check
  const hasPersonalData = /personal|user|customer|profile|data|email|name|address/.test(content);
  const gdprCompliant = !hasPersonalData || /privacy|consent|gdpr/.test(content);

  // HIPAA compliance check  
  const hasHealthData = /health|medical|patient|clinic|hospital|diagnosis|treatment/.test(content);
  const hipaaCompliant = !hasHealthData || /hipaa|encryption|secure/.test(content);

  // PCI compliance check
  const hasPaymentData = /payment|credit card|billing|checkout|transaction|stripe|paypal/.test(content);
  const pciCompliant = !hasPaymentData || /secure|encryption|pci|tokeniz/.test(content);

  // Determine risk level
  let riskLevel: "low" | "medium" | "high" = "low";
  const riskFactors = [
    hasPersonalData && !gdprCompliant,
    hasHealthData && !hipaaCompliant,
    hasPaymentData && !pciCompliant
  ].filter(Boolean).length;

  if (riskFactors >= 2) {
    riskLevel = "high";
  } else if (riskFactors === 1) {
    riskLevel = "medium";
  }

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (hasPersonalData && !gdprCompliant) {
    recommendations.push("Implement GDPR-compliant privacy policies and user consent mechanisms");
  }
  
  if (hasHealthData && !hipaaCompliant) {
    recommendations.push("Ensure HIPAA compliance with encrypted data storage and access controls");
  }
  
  if (hasPaymentData && !pciCompliant) {
    recommendations.push("Implement PCI-DSS compliant payment processing and data handling");
  }

  if (recommendations.length === 0) {
    recommendations.push("No specific compliance issues identified");
  }

  return {
    gdpr_compliant: gdprCompliant,
    hipaa_compliant: hipaaCompliant,
    pci_compliant: pciCompliant,
    risk_level: riskLevel,
    compliance_notes: `Analyzed for ${riskFactors} compliance risk factors`,
    recommendations
  };
}
