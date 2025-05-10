import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { standalone_routes } from '@/components/shared';
import Button from '@/components/shared_ui/button';
import useActiveAccount from '@/hooks/api/account/useActiveAccount';
import useIsGrowthbookIsLoaded from '@/hooks/growthbook/useIsGrowthbookLoaded';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import { StandaloneCircleUserRegularIcon } from '@deriv/quill-icons/Standalone';
import { requestOidcAuthentication } from '@deriv-com/auth-client';
import { Localize, useTranslations } from '@deriv-com/translations';
import { Header, useDevice, Wrapper } from '@deriv-com/ui';
import { Tooltip } from '@deriv-com/ui';
import { isDotComSite } from '../../../utils';
import { AppLogo } from '../app-logo';
import AccountsInfoLoader from './account-info-loader';
import AccountSwitcher from './account-switcher';
import MenuItems from './menu-items';
import MobileMenu from './mobile-menu';
import PlatformSwitcher from './platform-switcher';
import './header.scss';

// SBS imports
import { ArrowDownCircle, ArrowUpCircle, Mail } from 'lucide-react';
import { useState } from 'react';
import { Menu } from 'lucide-react';

const AppHeader = observer(() => {
    const { isGBLoaded, isGBAvailable } = useIsGrowthbookIsLoaded();
    const { isDesktop } = useDevice();
    const { isAuthorizing, activeLoginid } = useApiBase();
    const { client } = useStore() ?? {};

    const { data: activeAccount } = useActiveAccount({ allBalanceData: client?.all_accounts_balance });
    const { accounts, getCurrency } = client ?? {};
    const has_wallet = Object.keys(accounts ?? {}).some(id => accounts?.[id].account_category === 'wallet');

    const currency = getCurrency?.();
    const { localize } = useTranslations();

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const renderAccountSection = () => {
        if (isAuthorizing) {
            return <AccountsInfoLoader isLoggedIn isMobile={!isDesktop} speed={3} />;
        } else if (activeLoginid) {
            return (
                <>
                    {isDesktop &&
                        (() => {
                            const redirect_url = new URL(standalone_routes.personal_details);
                            const urlParams = new URLSearchParams(window.location.search);
                            const account_param = urlParams.get('account');
                            const is_virtual = client?.is_virtual || account_param === 'demo';

                            if (is_virtual) {
                                redirect_url.searchParams.set('account', 'demo');
                            } else if (currency) {
                                redirect_url.searchParams.set('account', currency);
                            }
                            return (
                                <Tooltip
                                    as='a'
                                    href={redirect_url.toString()}
                                    tooltipContent={localize('Manage account settings')}
                                    tooltipPosition='bottom'
                                    className='app-header__account-settings'
                                >
                                    <StandaloneCircleUserRegularIcon className='app-header__profile_icon' />
                                </Tooltip>
                            );
                        })()}
                    <AccountSwitcher activeAccount={activeAccount} />
                    {isDesktop &&
                        (has_wallet ? (
                            <Button
                                className='manage-funds-button'
                                has_effect
                                text={localize('Manage funds')}
                                onClick={() => {
                                    let redirect_url = new URL(standalone_routes.wallets_transfer);
                                    if (isGBAvailable && isGBLoaded) {
                                        redirect_url = new URL(standalone_routes.recent_transactions);
                                    }
                                    if (currency) {
                                        redirect_url.searchParams.set('account', currency);
                                    }
                                    window.location.assign(redirect_url.toString());
                                }}
                                primary
                            />
                        ) : (
                            <Button
                                primary
                                onClick={() => {
                                    const redirect_url = new URL(standalone_routes.cashier_deposit);
                                    if (currency) {
                                        redirect_url.searchParams.set('account', currency);
                                    }
                                    window.location.assign(redirect_url.toString());
                                }}
                                className='deposit-button'
                            >
                                {localize('Deposit')}
                            </Button>
                        ))}
                </>
            );
        } else {
            return (
                <div className='auth-actions'>
                    <Button
                        tertiary
                        onClick={async () => {
                            window.location.href = 'https://oauth.deriv.com/oauth2/authorize?app_id=71895&l=EN&brand=deriv';
                        }}
                    >
                        <Localize i18n_default_text='Log in' />
                    </Button>
                    <Button
                        primary
                        onClick={() => {
                            window.open('https://track.deriv.com/_71lZpQSowCdB4VdSfJsOp2Nd7ZgqdRLk/1/', '_blank');
                        }}
                    >
                        <Localize i18n_default_text='Sign up' />
                    </Button>
                </div>
            );
        }
    };

    return (
        <Header
            className={clsx('app-header', {
                'app-header--desktop': isDesktop,
                'app-header--mobile': !isDesktop,
            })}
        >
            <Wrapper variant='left'>
                {/* New logo section with proportional size increase */}
                

                {isDesktop ? (
                    <div className='mobile-menu'>
                        <button onClick={() => window.location.href = 'https://dm-pay.africa/'}>
                            <ArrowUpCircle className='mobile-menu__icon' />
                            Withdraw
                        </button>
                        <button onClick={() => window.location.href = 'https://dm-pay.africa/'}>
                            <ArrowDownCircle className='mobile-menu__icon' />
                            Deposit
                        </button>
                        <button onClick={() => window.location.href = 'https://t.me/ProfitMaxTraderHub'}>
                            <Mail className='mobile-menu__icon' />
                            Contact
                        </button>
                    </div>
                ) : (
                    <div
    className='mobile-menu-icon__button'
    onClick={() => setIsMenuOpen(!isMenuOpen)}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => { if (e.key === 'Enter') setIsMenuOpen(!isMenuOpen); }}
    style={{ cursor: 'pointer' }}
>
    <Menu />
</div>
                )}

                {isMenuOpen && !isDesktop && (
                    <div className='mobile-menu' style={{ background: 'rgba(0, 0, 0, 0.7)', border: '2px solid red' }}>
                        <button onClick={() => window.location.href = 'https://dm-pay.africa/'}>
                            <ArrowUpCircle className='mobile-menu__icon' />
                            Withdraw
                        </button>
                        <button onClick={() => window.location.href = 'https://dm-pay.africa/'}>
                            <ArrowDownCircle className='mobile-menu__icon' />
                            Deposit
                        </button>
                        <button onClick={() => window.location.href = 'https://t.me/ProfitMaxTraderHub'}>
                            <Mail className='mobile-menu__icon' />
                            Contact
                        </button>
                    </div>
                )}
            </Wrapper>
            <Wrapper variant='right'>{renderAccountSection()}</Wrapper>
        </Header>
    );
});

export default AppHeader;
