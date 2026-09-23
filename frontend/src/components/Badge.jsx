const Badge = ({ variant = 'primary', children, icon: Icon, className = '' }) => {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {Icon && <Icon size={12} />}
      {children}
    </span>
  );
};

export default Badge;
