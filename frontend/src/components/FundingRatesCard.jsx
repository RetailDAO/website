import { useFundingRates } from '../hooks/useApi';
import Tooltip, { CryptoTooltips } from './Tooltip';
import { useTheme } from '../context/ThemeContext';

function FundingRatesCard() {
  const { data, loading, error } = useFundingRates('BTC', null, 60000); // Refresh every minute
  const { colors } = useTheme();

  if (loading) {
    return (
      <div className={`${colors.bg.card} rounded-lg ${colors.shadow.card} p-6`}>
        <h2 className={`text-xl font-semibold mb-4 ${colors.text.primary}`}>Funding Rates</h2>
        <div className="text-center">
          <div className="animate-pulse">
            <div className={`h-8 ${colors.bg.tertiary} rounded mb-2`}></div>
            <div className={`h-4 ${colors.bg.tertiary} rounded`}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${colors.bg.card} rounded-lg ${colors.shadow.card} p-6`}>
        <h2 className={`text-xl font-semibold mb-4 ${colors.text.primary}`}>Funding Rates</h2>
        <div className="text-center text-red-600">
          <p>Error loading data</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const rates = data?.data?.rates || [];
  const statistics = data?.data?.statistics || {};

  const formatFundingRate = (rate) => {
    if (!rate) return 'N/A';
    return `${(rate * 100).toFixed(4)}%`;
  };

  const formatAnnualizedRate = (rate) => {
    if (!rate) return 'N/A';
    // Funding happens every 8 hours (3 times per day)
    const annualized = (rate * 3 * 365 * 100).toFixed(1);
    return `~${annualized}% APY`;
  };

  const getMarketSentiment = (rate) => {
    if (rate > 0.003) return { text: 'Strong bullish sentiment', color: 'text-green-600' };
    if (rate > 0.0015) return { text: 'Bullish sentiment', color: 'text-green-500' };
    if (rate > 0) return { text: 'Longs paying shorts', color: 'text-green-400' };
    if (rate > -0.0015) return { text: 'Shorts paying longs', color: 'text-red-400' };
    if (rate > -0.003) return { text: 'Bearish sentiment', color: 'text-red-500' };
    return { text: 'Strong bearish sentiment', color: 'text-red-600' };
  };


  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return `$${price.toLocaleString()}`;
  };

  const getRateColor = (rate) => {
    if (rate > 0.003) return 'text-red-600'; // High positive rate (0.3000%+)
    if (rate > 0) return 'text-green-600';   // Positive rate
    if (rate < -0.003) return 'text-red-600'; // High negative rate (-0.3000%+)
    return 'text-blue-600';                  // Low/neutral rate
  };

  const getNextFundingTime = (timeString) => {
    if (!timeString) return 'N/A';
    const fundingTime = new Date(timeString);
    const now = new Date();
    const diff = fundingTime - now;
    
    if (diff < 0) return 'Past due';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className={`${colors.bg.card} rounded-lg ${colors.shadow.card} p-6 animate-fade-in`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className={`text-xl font-semibold ${colors.text.primary}`}>Perp Funding Rate (7-Day Avg)</h2>
          <Tooltip
            title={CryptoTooltips.FundingRates.title}
            content={CryptoTooltips.FundingRates.content}
            educational={true}
            position="right"
          >
            <div className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold cursor-help">
              ?
            </div>
          </Tooltip>
        </div>
        <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
      </div>

      {rates.length > 0 ? (
        <>
          {/* Enhanced main funding rate display */}
          {rates.length > 0 && (
            <div className="text-center mb-4">
              <div className="text-3xl font-bold mb-2">
                <span className={getRateColor(rates[0].fundingRate)}>
                  {formatFundingRate(rates[0].fundingRate)}
                </span>
              </div>
              <div className={`text-sm ${colors.text.tertiary} mb-1`}>
                {formatAnnualizedRate(rates[0].fundingRate)}
              </div>
              <div className={`text-sm font-medium ${getMarketSentiment(rates[0].fundingRate).color}`}>
                {getMarketSentiment(rates[0].fundingRate).text}
              </div>
            </div>
          )}

          <div className="space-y-3 mb-4">
            {rates.slice(0, 3).map((rate, index) => {
              getMarketSentiment(rate.fundingRate);
              return (
                <div key={index} className={`flex justify-between items-center p-3 ${colors.bg.tertiary} rounded`}>
                  <div>
                    <p className={`font-semibold ${colors.text.primary}`}>{rate.exchange}</p>
                    <p className={`text-sm ${colors.text.tertiary}`}>{rate.symbol}</p>
                    {rate.price && (
                      <p className={`text-xs ${colors.text.muted}`}>{formatPrice(rate.price)}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${getRateColor(rate.fundingRate)}`}>
                      {formatFundingRate(rate.fundingRate)}
                    </p>
                    <p className={`text-xs ${colors.text.tertiary}`}>
                      {formatAnnualizedRate(rate.fundingRate)}
                    </p>
                    <p className={`text-xs ${colors.text.muted}`}>
                      Next: {getNextFundingTime(rate.nextFundingTime)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`border-t ${colors.border.primary} pt-3 text-sm`}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={colors.text.tertiary}>Average Rate</p>
                <p className={`font-semibold ${colors.text.primary}`}>
                  {formatFundingRate(statistics.averageFundingRate)}
                </p>
              </div>
              <div>
                <p className={colors.text.tertiary}>Total Pairs</p>
                <p className={`font-semibold ${colors.text.primary}`}>{statistics.totalPairs || 'N/A'}</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className={`text-center ${colors.text.muted}`}>
          <p>No funding rate data available</p>
        </div>
      )}
    </div>
  );
}

export default FundingRatesCard;