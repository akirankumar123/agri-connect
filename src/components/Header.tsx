import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSelector from './LanguageSelector';
import { LogOut, User, ShoppingCart, Leaf, Bell, Camera, BookOpen, Users, Briefcase, TrendingUp } from 'lucide-react';

const Header: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white shadow-sm border-b w-full">
      <div className="w-full px-2 sm:px-4 lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2 py-3">
          {/* Logo */}
          <div className="flex items-center space-x-2 shrink-0">
            <Leaf className="h-7 w-7 text-green-600" />
            <span className="text-xl font-bold text-gray-800">AgriAssist</span>
          </div>

          {/* Language Selector */}
          <div className="flex items-center shrink-0">
            <LanguageSelector />
          </div>

          {/* Navigation */}
          <nav className="flex flex-wrap items-center justify-start gap-2 w-full lg:w-auto">
            {isAuthenticated ? (
              <>
                {/* User Info */}
                <div className="flex items-center space-x-2 text-sm shrink-0">
                  <User className="h-4 w-4 text-gray-600" />
                  <span className="text-gray-700">{t('welcomeUser')}, {user?.name}</span>
                </div>

                {/* Cart Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap"
                  onClick={() => navigate('/')}
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>{t('marketplace')}</span>
                </Button>

                {/* Alerts Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap"
                  onClick={() => navigate('/alerts')}
                >
                  <Bell className="h-4 w-4" />
                  <span>{t('alerts')}</span>
                </Button>

                {/* Scanner Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap"
                  onClick={() => navigate('/scanner')}
                >
                  <Camera className="h-4 w-4" />
                  <span>{t('scanner')}</span>
                </Button>

                {/* Crop Guide Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap"
                  onClick={() => navigate('/crop-guide')}
                >
                  <BookOpen className="h-4 w-4" />
                  <span>{t('cropGuide')}</span>
                </Button>

                {/* Rover Monitoring Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap"
                  onClick={() => navigate('/rover-monitoring')}
                >
                  <Leaf className="h-4 w-4" />
                  <span>{t('roverMonitor')}</span>
                </Button>

                {/* Post Job Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap"
                  onClick={() => navigate('/post-job')}
                >
                  <Users className="h-4 w-4" />
                  <span>{t('postJob')}</span>
                </Button>

                {/* My Profile Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap"
                  onClick={() => navigate('/farmer-profile')}
                >
                  <User className="h-4 w-4" />
                  <span>{t('myProfile')}</span>
                </Button>

                {/* Find Jobs Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap"
                  onClick={() => navigate('/labour-marketplace')}
                >
                  <Briefcase className="h-4 w-4" />
                  <span>{t('findJobs')}</span>
                </Button>

                {/* View Matches Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap"
                  onClick={() => navigate('/job-matches')}
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>{t('viewMatches')}</span>
                </Button>

                {/* Local Labour Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap"
                  onClick={() => navigate('/local-labour')}
                >
                  <Users className="h-4 w-4" />
                  <span>{t('localLabor')}</span>
                </Button>

                {/* Marketplace Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap"
                  onClick={() => navigate('/marketplace')}
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>{t('marketplace')}</span>
                </Button>

                {/* Logout Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t('logout')}</span>
                </Button>
              </>
            ) : (
              <>
                {/* Login Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap"
                >
                  <User className="h-4 w-4" />
                  <span>{t('login')}</span>
                </Button>

                {/* Register Button */}
                <Button
                  size="sm"
                  onClick={() => navigate('/login')}
                  className="bg-green-600 hover:bg-green-700 flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap"
                >
                  <span>{t('getStarted')}</span>
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;