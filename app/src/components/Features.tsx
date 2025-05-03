
import { Shield, Key, Link as LinkIcon, Lock } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: <Shield className="h-8 w-8 text-primary" />,
      title: "Blockchain Security",
      description:
        "Leverage the immutability and decentralization of blockchain technology for enhanced security and transparency.",
    },
    {
      icon: <Key className="h-8 w-8 text-primary" />,
      title: "Zero-Knowledge Proofs",
      description:
        "Validate your identity without revealing sensitive information, preserving privacy during authentication.",
    },
    {
      icon: <LinkIcon className="h-8 w-8 text-primary" />,
      title: "OAuth 2.0 Integration",
      description:
        "Seamlessly integrate with existing OAuth providers while maintaining the security benefits of blockchain.",
    },
    {
      icon: <Lock className="h-8 w-8 text-primary" />,
      title: "Self-Sovereign Identity",
      description:
        "Maintain complete control over your digital identity without reliance on centralized authorities.",
    },
  ];

  return (
    <div id="features" className="py-20 px-6 md:px-12">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Key Features</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our platform combines cutting-edge cryptography with modern authentication
            standards to provide a secure and privacy-preserving identity solution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-card/50 backdrop-blur-sm p-6 rounded-lg border border-border hover:border-primary/50 transition-colors"
            >
              <div className="mb-4 p-2 rounded-lg bg-muted inline-block">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Features;
