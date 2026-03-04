type Props = {
  action: string;
  className?: string;
};

const WalletRequiredNotice: React.FC<Props> = ({ action, className = "" }) => {
  return (
    <div className={`alert alert-warning ${className}`.trim()}>
      <span>Connect your wallet to {action}.</span>
    </div>
  );
};

export default WalletRequiredNotice;
