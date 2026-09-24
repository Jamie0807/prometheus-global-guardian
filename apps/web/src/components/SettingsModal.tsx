/**
 * 提供应用设置弹窗组件。
 */
import React, { useState } from "react";
import { useMapState } from "../features/map/state/MapStateContext";
import { useUIState } from "../state/UIStateContext";
import { useAuth } from "../state/AuthContext";
import { AuthApiError } from "../services/auth/userAuthService";

const SettingsModal: React.FC = () => {
  const { mapStyle, setMapStyle } = useMapState();
  const { activeModal, closeModal } = useUIState();
  const { deleteAccount } = useAuth();
  const [accountPassword, setAccountPassword] = useState("");
  const [accountError, setAccountError] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  if (activeModal !== "settings") return null;

  const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMapStyle(e.target.value);
  };

  const handleDeleteAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!window.confirm("删除账号会永久清除该账号的对话和记忆，是否继续？")) return;
    setDeletingAccount(true);
    setAccountError("");
    try {
      await deleteAccount(accountPassword);
    } catch (error: unknown) {
      setAccountError(
        error instanceof AuthApiError ? error.message : "删除失败，请检查网络后重试。",
      );
    } finally {
      setDeletingAccount(false);
    }
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
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>地图设置</span>
          </div>
          <button className="close-btn" onClick={closeModal} aria-label="关闭设置">
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

        <div className="form-group">
          <label className="form-label" htmlFor="map-style">
            地图样式
          </label>
          <select
            id="map-style"
            className="form-input"
            value={mapStyle}
            onChange={handleStyleChange}
          >
            <option value="dark-v11">深色</option>
            <option value="light-v11">浅色</option>
            <option value="streets-v12">街道</option>
            <option value="outdoors-v12">户外</option>
            <option value="satellite-v9">卫星</option>
            <option value="satellite-streets-v12">卫星街道</option>
          </select>
        </div>

        <div
          style={{
            paddingTop: "16px",
            borderTop: "1px solid #374151",
            marginTop: "16px",
          }}
        >
          <h3 style={{ color: "white", fontWeight: 600, marginBottom: "8px" }}>关于</h3>
          <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>全球灾害监控平台 v1.0</p>
          <p style={{ color: "#9ca3af", fontSize: "0.75rem", marginTop: "8px" }}>
            实时灾害监控。数据由 DisasterAWARE、NASA、ESA、EONET、USGS 和 GDACS 提供。
          </p>
        </div>

        <form
          className="account-delete-section"
          onSubmit={(event) => void handleDeleteAccount(event)}
        >
          <h3>账号管理</h3>
          <p>删除账号将清除关联的 AI 对话、摘要、记忆和登录会话。</p>
          <label className="form-label" htmlFor="delete-account-password">
            当前密码
          </label>
          <input
            id="delete-account-password"
            className="form-input"
            type="password"
            autoComplete="current-password"
            required
            value={accountPassword}
            onChange={(event) => setAccountPassword(event.target.value)}
          />
          {accountError && (
            <p className="auth-error" role="alert">
              {accountError}
            </p>
          )}
          <button className="btn account-delete-button" type="submit" disabled={deletingAccount}>
            {deletingAccount ? "正在删除…" : "永久删除账号"}
          </button>
        </form>

        <button
          className="btn btn-primary"
          style={{ width: "100%", marginTop: "24px" }}
          onClick={closeModal}
        >
          关闭
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;
