<template>
    <div class="bg-card border rounded-xl p-4 sm:p-6 order-2 lg:order-none shadow-lg">
        <h3 class="font-heading text-xl sm:text-2xl mb-3">Story</h3>
        <!-- note: using unmount-on-hide="false" to make sure the image is downloaded immediately right after the page is opened -->
        <Accordion :default-value="[ACCORDION_ITEMS_ID.MORTGAGE_WORK, ACCORDION_ITEMS_ID.WHAT_IS_BORDEL]" type="multiple" :unmount-on-hide="false">
            <AccordionItem :value="ACCORDION_ITEMS_ID.MORTGAGE_WORK">
                <AccordionTrigger class="font-heading text-base sm:text-lg md:text-xl font-semibold cursor-pointer">
                    <span style="margin-top: -4px;">How Does The Mortgage Work?</span>
                </AccordionTrigger>
                <AccordionContent>
                    <p class="leading-relaxed text-sm sm:text-base mb-4 text-justify">
                        This mortgage is a decentralized, crowdfunded DeFi loan designed to bootstrap community projects by leveraging crypto collateral (weETH) with a 75% loan-to-value ratio over five years. 
                        Supporters lend stablecoins (USDC) at a modest interest rate of 2.5%, receiving gradual loan repayments along with non-monetary rewards like memberships and event access. 
                        By distributing risk across many lenders instead of relying on one, this setup encourages community involvement and ensures more accessible and sustainable funding.
                    </p>

                    <div class="my-4 flex justify-center">
                        <img src="/images/DeFiMortgage.png" alt="DeFi Mortgage Flow" class="w-full"/>
                    </div>

                    <a href="https://paragraph.com/@bordel/decentralized-crowdloaning" target="_blank">
                        <Button variant="outline" class="w-full">
                            <span>Full article about Bordel Mortgage</span>
                            <img
                                src="/icons/external.svg"
                                alt="Bordel Hackerspace Link"
                                class="w-4 h-4 transition-all duration-200 group-hover:brightness-0 group-hover:invert"
                                style="filter: brightness(0) saturate(100%) invert(40%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(89%);"
                            />
                        </Button>
                    </a>
                </AccordionContent>
            </AccordionItem>
            
            <AccordionItem :value="ACCORDION_ITEMS_ID.WHAT_IS_BORDEL">
                <AccordionTrigger class="font-heading text-base sm:text-lg md:text-xl font-semibold cursor-pointer">
                    <span style="margin-top: -4px;">What Is Bordel Hackerspace?</span>
                </AccordionTrigger>
                <AccordionContent>
                    <p class="leading-relaxed text-sm sm:text-base text-justify">
                        Bordel Hackerspace is a community-driven creators' space in Prague that has been nurturing creativity, experimentation, and education in technology, art, and science for over three years. 
                        Founded by passionate hackers and builders from the Ethereum community, it has become a hub for cypherpunks, scientists, and artists to access tools and collaborate on free and open projects. 
                        Despite challenges like relocation, Bordel continues to push forward its mission to support public-benefit innovation and community growth.
                    </p>

                    <div class="my-4 flex justify-center">
                        <img src="/images/bordel-gif.gif" alt="Bordel Hackerspace" class="w-full sm:w-3/4 md:w-1/2"/>
                    </div>

                    <a href="https://bordel.wtf" target="_blank">
                        <Button variant="outline" class="w-full">
                            <span>Visit Bordel Website</span>
                            <img
                                src="/icons/external.svg"
                                alt="Bordel Hackerspace Link"
                                class="w-4 h-4 transition-all duration-200 group-hover:brightness-0 group-hover:invert"
                                style="filter: brightness(0) saturate(100%) invert(40%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(89%);"
                            />
                        </Button>
                    </a>

                    <a href="https://signal.group/#CjQKILd9jG3SmC5jEkCf0VbavrETuLixY7wxITmlkg8dWbdrEhD6qay9BKGWmjYLRFKFZjeB" target="_blank" class="mt-3 block">
                        <Button variant="outline" class="w-full">
                            <span>Join Bordel's Signal Group</span>
                            <img
                                src="/icons/external.svg"
                                alt="Signal Group Link"
                                class="w-4 h-4 transition-all duration-200 group-hover:brightness-0 group-hover:invert"
                                style="filter: brightness(0) saturate(100%) invert(40%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(89%);"
                            />
                        </Button>
                    </a>
                </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="ownership">
                <AccordionTrigger class="font-heading text-base sm:text-lg md:text-xl font-semibold cursor-pointer">
                    <span style="margin-top: -4px;">Who Gets to Own the Real Estate?</span>
                </AccordionTrigger>
                <AccordionContent>
                    <div class="leading-relaxed text-sm sm:text-base text-justify space-y-3">
                        <p>
                            A joint-stock company will be established to hold the real estate. Each collateral contributor will receive shares proportional to their contribution, ensuring fair ownership distribution among supporters.
                        </p>
                        <p>
                            The property will be purchased under the company's name, and the loan will be repaid primarily through the space's operational revenue, including membership fees and donations from the community.
                        </p>
                        <p>
                            If any shareholder contributes additional funds from their own pocket to help repay the loan, new shares will be minted to reflect their increased contribution, maintaining fairness in ownership.
                        </p>
                        <p>
                            Once the loan is fully repaid, all collateral will be returned to the original contributors, and the hackerspace will be completely debt-free.
                        </p>
                        <p>
                            The ultimate goal is to create a rent-free, mortgage-free hackerspace where all membership fees can be directed toward maintenance, improvements, and expanding the community's resources - rather than servicing debt rent payments.
                        </p>
                    </div>
                </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="members">
                <AccordionTrigger class="font-heading text-base sm:text-lg md:text-xl font-semibold cursor-pointer">
                    <span style="margin-top: -4px;">Members</span>
                </AccordionTrigger>
                <AccordionContent>
                    <div class="space-y-4 pt-2">
                        <div v-for="member in MEMBERS" :key="member.twitter" class="flex gap-3 border rounded-lg p-3 bg-background/50 hover:bg-background/70 transition-colors">
                            <a :href="`https://x.com/${member.twitter}`" target="_blank" class="flex-shrink-0">
                                <img :src="member.profileImage" :alt="member.name" class="w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-gray-600 hover:border-primary-foreground transition-colors" />
                            </a>
                            <div class="flex-grow min-w-0">
                                <div class="flex items-center gap-2 mb-1">
                                    <a :href="`https://x.com/${member.twitter}`" target="_blank" class="font-semibold text-white hover:text-primary-foreground transition-colors truncate">
                                        {{ member.name }}
                                    </a>
                                    <a :href="`https://x.com/${member.twitter}`" target="_blank" class="text-gray-400 hover:text-primary-foreground transition-colors flex-shrink-0">
                                        <img src="/icons/external.svg" alt="Twitter Link" class="w-3 h-3" style="filter: brightness(0) saturate(100%) invert(40%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(89%);" />
                                    </a>
                                </div>
                                <p class="text-xs sm:text-sm text-gray-300 text-justify">{{ member.bio }}</p>
                            </div>
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    </div>
</template>

<script lang="ts" setup>

enum ACCORDION_ITEMS_ID {
    MORTGAGE_WORK = 'mortgage-work',
    WHAT_IS_BORDEL = 'what-is-bordel',
}

interface Member {
    name: string
    twitter: string
    profileImage: string
    bio: string
}

const MEMBERS: Member[] = [
    {
        name: 'Mario Havel',
        twitter: 'TMIYChao',
        profileImage: 'https://pbs.twimg.com/profile_images/1471102487365136384/3FeDe54c_400x400.jpg',
        bio: 'Bordel co-founder, Ethereum core dev contributor, and passionate about building open-source tools for the Ethereum ecosystem - and cats.'
    },
    {
        name: 'Josef Jelacic',
        twitter: 'JosefJ_',
        profileImage: 'https://pbs.twimg.com/profile_images/1856159212973502464/wgiwZVxy_400x400.jpg',
        bio: 'Bordel co-founder, DeFi innovator focused on onchain mortgages and commmunity organizer hosting events like ETHPrague.'
    },
    {
        name: 'Ceci',
        twitter: 'hyperalchemy',
        profileImage: 'https://pbs.twimg.com/profile_images/868854149428936704/NNMo0TNV_400x400.jpg',
        bio: 'Xenofeminist cat herder organizing ETHPrague and contributing to Ethereum projects.'
    },
    {
        name: 'Josef Gattermayer',
        twitter: 'jgattermayer',
        profileImage: 'https://pbs.twimg.com/profile_images/1589214087040360448/FIGprxeL_400x400.jpg',
        bio: 'Co-Founder & CEO of Ackee Blockchain (cybersecurity firm) and an Assistant Professor pursuing PhD at FIT CTU'
    },
    {
        name: 'Albina',
        twitter: 'enjojoyy',
        profileImage: 'https://pbs.twimg.com/profile_images/1997389601216880640/o6jlOaId_400x400.jpg',
        bio: 'Building High Agency Dev. Leads developer relations at Masumi Network & Sokosumi. Math enthusiast focused on brain-computer interfaces & acceleration.'
    }
]
</script>
