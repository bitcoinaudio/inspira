type Props = {
  action: string;
  className?: string;
};

const WalletRequiredNotice: React.FC<Props> = ({ action, className = "" }) => {
  return (
    <div className={`rounded-[18px] border border-warning/30 bg-warning/10 px-4 py-3 text-warning ${className}`.trim()}>
      <span>Connect your wallet to {action}.</span>
    </div>
  );
};

export default WalletRequiredNotice;
