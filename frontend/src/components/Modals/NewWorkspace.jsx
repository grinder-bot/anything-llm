import Workspace from "@/models/workspace";
import { CURRENT_YEAR } from "@/utils/constants";
import paths from "@/utils/paths";
import { X } from "@phosphor-icons/react";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const noop = () => false;
export default function NewWorkspaceModal({ hideModal = noop }) {
  const { t } = useTranslation();
  const formEl = useRef(null);
  const [error, setError] = useState(null);
  const handleCreate = async (e) => {
    setError(null);
    e.preventDefault();
    const data = {};
    const form = new FormData(formEl.current);
    for (var [key, value] of form.entries()) data[key] = value;
    const { workspace, message } = await Workspace.new(data);
    if (workspace) {
      window.location.href = paths.workspace.chat(workspace.slug);
    }
    setError(message);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] h-full bg-black bg-opacity-50 flex items-center justify-center">
      <div
        className="flex fixed top-0 left-0 right-0 w-full h-full"
        onClick={hideModal}
      />
      <div className="relative w-[500px] max-h-full">
        <div className="relative bg-modal-gradient rounded-lg shadow-md border-2 border-accent">
          <div className="flex items-start justify-between p-4 border-b rounded-t border-white/10">
            <h3 className="text-xl font-semibold text-white">
              {t("dashboard.workspace")}
            </h3>
            <button
              onClick={hideModal}
              type="button"
              className="transition-all duration-300 text-gray-400 bg-transparent hover:border-white/60 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center bg-sidebar-button hover:bg-menu-item-selected-gradient hover:border-slate-100 hover:border-opacity-50 border-transparent border"
            >
              <X className="text-gray-300 text-lg" />
            </button>
          </div>
          <form ref={formEl} onSubmit={handleCreate}>
            <div className="p-6 space-y-6 flex h-full w-full">
              <div className="w-full flex flex-col gap-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block mb-2 text-sm font-medium text-white"
                  >
                    {t("dashboard.name")}
                  </label>
                  <input
                    name="name"
                    type="text"
                    id="name"
                    className="bg-zinc-900 w-full text-white placeholder:text-white/20 text-sm rounded-lg focus:border-white block p-2.5"
                    placeholder={t("dashboard.mySpace")}
                    required={true}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label
                    htmlFor="year"
                    className="block mb-2 text-sm font-medium text-white"
                  >
                    {t("dashboard.year")}
                  </label>
                  <input
                    name="year"
                    type="number"
                    id="year"
                    className="bg-zinc-900 w-full text-white placeholder:text-white/20 text-sm rounded-lg focus:border-white block p-2.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder={t("dashboard.myYear")}
                    required={true}
                    autoComplete="off"
                    min={2000}
                    max={CURRENT_YEAR}
                    maxLength={4}
                    step={1}
                  />
                </div>
                {error && (
                  <p className="text-red-400 text-sm">Error: {error}</p>
                )}
              </div>
            </div>
            <div className="flex w-full justify-end items-center p-6 space-x-2 border-t border-white/10 rounded-b">
              <button
                type="submit"
                className="transition-all duration-300 border border-slate-200 px-4 py-2 rounded-lg text-white text-sm items-center flex gap-x-2 hover:bg-slate-200 hover:text-slate-800 focus:ring-gray-800"
              >
                {t("common.save")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export function useNewWorkspaceModal() {
  const [showing, setShowing] = useState(false);
  const showModal = () => {
    setShowing(true);
  };
  const hideModal = () => {
    setShowing(false);
  };

  return { showing, showModal, hideModal };
}
