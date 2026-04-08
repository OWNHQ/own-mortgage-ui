<template>
  <nav class="flex justify-between items-center">
    <div class="text-primary">
      <img width="72" height="28" :src="`/images/own-logo.svg`" alt="OWN Logo" class="w-16 h-auto sm:w-20 md:w-[72px]" />
    </div>
    <div class="flex justify-end gap-1 sm:gap-2 items-center">
      <ConferenceVoucherCta />
      <ShareModal />
      <GetUpdatesModal />
      <ConnectWalletBtn />
    </div>
  </nav>
</template>
