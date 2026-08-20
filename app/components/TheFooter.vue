<template>
  <footer class="platform-footer">
    <div class="platform-footer__cell platform-footer__cell--wide">
      <EarlyAccessModal />
    </div>
    <div class="platform-footer__cell">
      <span>MAINNET · SERVICED ONCHAIN</span>
    </div>
    <div class="platform-footer__cell platform-footer__rights">
      <a href="https://ownlabs.co/terms-and-conditions.pdf" target="_blank" rel="noopener noreferrer">TERMS ↗</a>
      <span>© 2026 OWN AG</span>
    </div>
  </footer>
</template>

<style scoped>
.platform-footer {
  display: grid;
  min-height: 40px;
  grid-template-columns: 2fr 1fr 1fr;
  margin-top: 20px;
  border: 1px solid var(--rule);
  color: var(--muted-ink);
  font: 400 10px/14px var(--font-mono);
  text-transform: uppercase;
}

.platform-footer__cell {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 16px;
  padding: 0 20px;
}

.platform-footer__cell + .platform-footer__cell {
  border-left: 1px solid var(--rule);
}

.platform-footer__rights {
  justify-content: space-between;
}

.platform-footer a {
  color: var(--teal-dark);
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (max-width: 760px) {
  .platform-footer {
    grid-template-columns: 1fr;
  }

  .platform-footer__cell {
    min-height: 40px;
  }

  .platform-footer__cell + .platform-footer__cell {
    border-top: 1px solid var(--rule);
    border-left: 0;
  }
}
</style>
