import React from "react";
import { useMapState } from "../features/map/state/MapStateContext";
import { useUIState } from "../state/UIStateContext";

const SettingsModal: React.FC = () => {
  const { mapStyle, setMapStyle } = useMapState();
  const { activeModal, closeModal } = useUIState();
  if (activeModal !== "settings") return null;

  const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMapStyle(e.target.value);
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
            <span>Map Settings</span>
          </div>
          <button className="close-btn" onClick={closeModal}>
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
            Map Style
          </label>
          <select
            id="map-style"
            className="form-input"
            value={mapStyle}
            onChange={handleStyleChange}
          >
            <option value="dark-v11">Dark</option>
            <option value="light-v11">Light</option>
            <option value="streets-v12">Streets</option>
            <option value="outdoors-v12">Outdoors</option>
            <option value="satellite-v9">Satellite</option>
            <option value="satellite-streets-v12">Satellite Streets</option>
          </select>
        </div>

        <div
          style={{
            paddingTop: "16px",
            borderTop: "1px solid #374151",
            marginTop: "16px",
          }}
        >
          <h3 style={{ color: "white", fontWeight: 600, marginBottom: "8px" }}>About</h3>
          <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
            Prometheus Space Technologies Global Guardian v1.0
          </p>
          <p style={{ color: "#9ca3af", fontSize: "0.75rem", marginTop: "8px" }}>
            – Real-time disaster monitoring. Data powered by DisasterAWARE, NASA, ESA, EONET, USGS,
            and GDACS.
          </p>
        </div>

        <button
          className="btn btn-primary"
          style={{ width: "100%", marginTop: "24px" }}
          onClick={closeModal}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;
