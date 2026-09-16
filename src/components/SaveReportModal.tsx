/**
 * 提供报告保存与导出弹窗组件。
 */
import React, { useState } from "react";
import type { SaveReportPayload } from "../types";
import { useMapState } from "../features/map/state/MapStateContext";
import { useUIState } from "../state/UIStateContext";
import { createClientLogger } from "../utils/logger";
import { buildReportHtml } from "../utils/reportHtml";

const logger = createClientLogger("save-report-modal");

const SaveReportModal: React.FC = () => {
  const { filter, hazards } = useMapState();
  const { activeModal, closeModal } = useUIState();
  const [reportName, setReportName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  if (activeModal !== "save-report") return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 构建 HTML 报告并触发浏览器下载。
    const reportData: SaveReportPayload & { timestamp: string } = {
      reportName,
      organization,
      email,
      notes,
      disasters: hazards,
      filter,
      timestamp: new Date().toISOString(),
    };

    const dataBlob = new Blob([buildReportHtml(reportData)], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    const fileName =
      reportName
        .trim()
        .replace(/[^\p{L}\p{N}]+/gu, "_")
        .replace(/^_+|_+$/g, "") || "灾害报告";
    link.download = `${fileName}_${Date.now()}.html`;
    link.click();
    URL.revokeObjectURL(url);

    logger.debug("report_download_requested", { hazardCount: hazards.length });
    closeModal();
  };

  return (
    <div className="modal active">
      <div className="modal-content">
        <div className="modal-header">
          <div className="modal-title">
            <svg width="24" height="24" fill="none" stroke="#60a5fa" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            <span>保存灾害报告</span>
          </div>
          <button className="close-btn" onClick={closeModal} aria-label="关闭保存报告弹窗">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">报告名称 *</label>
            <input
              type="text"
              className="form-input"
              required
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder="例如：2026 年 9 月全球灾害评估"
            />
          </div>

          <div className="form-group">
            <label className="form-label">组织</label>
            <input
              type="text"
              className="form-input"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="请输入组织名称"
            />
          </div>

          <div className="form-group">
            <label className="form-label">邮箱</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@example.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">补充说明</label>
            <textarea
              className="form-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="请输入补充观察或说明……"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
              <span>下载报告</span>
            </button>
          </div>
        </form>

        <p className="form-note">报告将以 HTML 文件保存，可在浏览器中查看或打印为 PDF。</p>
      </div>
    </div>
  );
};

export default SaveReportModal;
