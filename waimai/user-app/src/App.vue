<script setup lang="ts"></script>
<template><slot /></template>
<style>
page {
  background: #f5f7f2;
  color: #263c2e;
  font-family:
    -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei",
    sans-serif;
  font-size: 14px;
  line-height: 1.5;
}
view,
text,
.app-button,
.app-button,
input,
textarea {
  box-sizing: border-box;
}
.app-button {
  font: inherit;
  color: inherit;
  border: 0;
  line-height: 1.5;
  padding: 0;
  margin: 0;
  background: transparent;
  overflow: visible;
}
.app-button::after {
  border: 0;
}
.app-button[disabled] {
  opacity: 0.45;
  color: inherit;
  background: inherit;
  cursor: not-allowed;
}
input,
textarea {
  font: inherit;
  color: #263c2e;
  min-width: 0;
}
input {
  height: 44px;
  font-size: 16px;
}
.page {
  min-height: 100vh;
  max-width: 480px;
  margin: 0 auto;
  padding: 0 16px 28px;
  background: #f5f7f2;
}
.with-nav {
  padding-bottom: 100px;
}
.with-footer {
  padding-bottom: 122px;
}
.page-head {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 64px;
  padding: 10px 0;
  background: #f5f7f2;
}
.head-title {
  font-size: 18px;
  font-weight: 600;
  flex: 1;
}
.icon-button {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card {
  background: #fff;
  border-radius: 17px;
  padding: 18px;
}
.stack {
  display: grid;
  gap: 14px;
}
.muted {
  color: #718075;
}
.small {
  font-size: 12px;
}
.price {
  color: #b94e2c;
  font-weight: 600;
}
.title {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.4;
}
.section-title {
  font-size: 16px;
  font-weight: 600;
}
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin: 20px 0 12px;
}
.primary-btn,
.secondary-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 48px;
  padding: 11px 17px;
  border-radius: 12px;
  font-weight: 600;
}
.primary-btn {
  background: #245d3f;
  color: #fff;
}
.primary-btn[disabled] {
  background: #245d3f;
  color: #fff;
}
.secondary-btn {
  background: #e9f1e1;
  color: #245d3f;
}
.secondary-btn[disabled] {
  background: #e9f1e1;
  color: #245d3f;
}
.outline-btn {
  border: 1px solid #dce5d9;
  border-radius: 11px;
  padding: 9px 13px;
  min-height: 42px;
  font-size: 13px;
  background: #fff;
}
.text-btn {
  color: #245d3f;
  min-height: 44px;
  padding: 8px 3px;
}
.danger {
  color: #b33e30;
}
.bottom-nav {
  position: fixed;
  z-index: 20;
  bottom: 0;
  left: 0;
  right: 0;
  max-width: 480px;
  margin: auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: #fff;
  border-top: 1px solid #e4ebe0;
  padding: 10px 8px calc(10px + env(safe-area-inset-bottom));
}
.bottom-nav .app-button,
.bottom-nav .app-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 11px;
  color: #77867b;
  min-height: 46px;
}
.bottom-nav .app-button.active,
.bottom-nav .app-button.active {
  color: #245d3f;
  font-weight: 600;
}
.fixed-footer {
  position: fixed;
  z-index: 15;
  bottom: 0;
  left: 0;
  right: 0;
  margin: auto;
  max-width: 480px;
  background: #fff;
  border-top: 1px solid #e4ebe0;
  padding: 14px 16px calc(14px + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.fixed-footer .primary-btn {
  flex-shrink: 0;
}
.footer-amount {
  font-size: 23px;
  font-weight: 600;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
}
.row-start {
  align-items: flex-start;
}
.divider {
  height: 1px;
  background: #e9eee5;
  margin: 12px 0;
}
.notice {
  background: #edf3e5;
  border-radius: 12px;
  padding: 13px 15px;
  color: #52694e;
  font-size: 12px;
}
.notice.warning {
  background: #fff1df;
  color: #865721;
}
.error-message {
  background: #fff0ec;
  color: #b33e30;
  padding: 12px;
  border-radius: 10px;
  font-size: 13px;
}
.data-state {
  text-align: center;
  padding: 56px 16px;
}
.state-icon {
  background: #e9f1e1;
  border-radius: 24px;
  width: 70px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 18px;
}
.state-title {
  font-size: 16px;
  font-weight: 600;
}
.state-description {
  font-size: 13px;
  margin-top: 8px;
}
.state-action {
  margin: 20px auto 0;
  max-width: 220px;
}
.chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.chip {
  font-size: 12px;
  min-height: 36px;
  padding: 8px 13px;
  border-radius: 9px;
  background: #fff;
  color: #657569;
}
.chip.active {
  background: #245d3f;
  color: #fff;
}
.form-field {
  display: block;
  margin-bottom: 17px;
}
.field-label {
  font-size: 13px;
  display: block;
  margin-bottom: 8px;
  color: #5d7063;
}
.form-field input,
.form-field textarea {
  background: #f4f7f0;
  border-radius: 10px;
  padding: 10px 12px;
  width: 100%;
}
.form-field textarea {
  height: 92px;
  font-size: 16px;
}
.form-help {
  font-size: 12px;
  color: #77867b;
  margin: 10px 0 17px;
}
.stepper {
  display: flex;
  align-items: center;
  gap: 10px;
}
.stepper .app-button,
.stepper .app-button {
  width: 34px;
  min-height: 36px;
  border: 1px solid #e0e7dc;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}
.stepper .app-button.add,
.stepper .app-button.add {
  background: #245d3f;
  border-color: #245d3f;
  color: #fff;
}
.stepper .app-button[disabled],
.stepper .app-button[disabled] {
  opacity: 0.35;
}
.stepper text {
  min-width: 16px;
  text-align: center;
  font-size: 13px;
}
.pill {
  font-size: 11px;
  background: #eaf2e2;
  color: #245d3f;
  padding: 4px 8px;
  border-radius: 6px;
}
.pill.muted {
  background: #edf0ea;
  color: #77867b;
}
/* #ifdef H5 */
body {
  background: #e8ede4;
}
#app {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  background: #f5f7f2;
  box-shadow: 0 0 80px #23472a0a;
}
uni-page-body {
  min-height: 100vh;
}
.app-button,
.app-button {
  cursor: pointer;
}
.app-button:focus-visible,
.app-button:focus-visible {
  outline: 2px solid #548b63;
  outline-offset: 3px;
}
/* #endif */
@media (max-width: 360px) {
  .page {
    padding-left: 12px;
    padding-right: 12px;
  }
  .fixed-footer {
    padding-left: 12px;
    padding-right: 12px;
  }
  .card {
    padding: 15px;
  }
  .stepper {
    gap: 5px;
  }
  .stepper .app-button,
  .stepper .app-button {
    width: 32px;
  }
  .title {
    font-size: 22px;
  }
}
@media (pointer: coarse) {
  .stepper .app-button,
  .stepper .app-button {
    min-height: 44px;
  }
  .chip {
    min-height: 44px;
  }
}
</style>
