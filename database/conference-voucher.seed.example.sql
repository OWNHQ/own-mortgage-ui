-- Copy this file to a private local SQL file before seeding production.
-- Do not commit real wallet addresses or real voucher codes to this repository.

INSERT INTO eligible_wallets (address, voucher_code, claimed_at, created_at, updated_at)
VALUES
  (
    '0x1111111111111111111111111111111111111111',
    'ETHPRAGUE26-EXAMPLE-001',
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    '0x2222222222222222222222222222222222222222',
    'ETHPRAGUE26-EXAMPLE-002',
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );
