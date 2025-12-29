import React, { useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { Link } from 'react-router-dom';
import { ConnectKitButton } from 'connectkit';
import { useAdminPermission } from '../../hooks/useAdminPermission';

interface WalletHeaderProps {
  title: string;
  subtitle?: string;
  showUserLink?: boolean;
  userLinkText?: string;
  userLinkPath?: string;
}

const WalletHeader: React.FC<WalletHeaderProps> = ({
  title,
  subtitle,
  showUserLink = false,
  userLinkText = '用户端',
  userLinkPath = '/',
}) => {
  const { address, isConnected, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const { isAuthorized, isLoading: isCheckingPermission } = useAdminPermission();

  // 监听账户变化
  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // 用户断开连接
        disconnect();
      } else {
        // 账户已切换，wagmi 会自动更新，刷新页面以确保数据同步
        window.location.reload();
      }
    };

    ethereum.on('accountsChanged', handleAccountsChanged);

    return () => {
      ethereum?.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, [disconnect]);

  return (
    <header className="bg-black/30 backdrop-blur-sm border-b border-purple-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">G</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{title}</h1>
              {subtitle && <p className="text-xs text-purple-300">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {isConnected && address && (
              <div className="text-right hidden sm:block">
                <p className="text-xs text-purple-300">钱包地址</p>
                <p className="text-sm font-mono text-white">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </p>
              </div>
            )}
            {/* 只有授权的多签钱包或拥有管理角色的用户才能看到管理端链接 */}
            {showUserLink && isAuthorized && !isCheckingPermission && (
              <Link
                to={userLinkPath}
                className="bg-purple-600/50 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-purple-600 transition-colors"
              >
                {userLinkText}
              </Link>
            )}
              <ConnectKitButton />
          </div>
        </div>
      </div>
    </header>
  );
};

export default WalletHeader;

