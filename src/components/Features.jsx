const Features = () => {
  const features = [
    {
      id: 1,
      title: "Anonymous Expression",
      description: "Share your thoughts and opinions without revealing your identity. Your privacy is our top priority.",
      icon: "🔒"
    },
    {
      id: 2,
      title: "Safe Platform",
      description: "Built with security in mind. Advanced encryption ensures your data remains confidential and protected.",
      icon: "🛡️"
    },
    {
      id: 3,
      title: "Community Driven",
      description: "Join a supportive community where everyone can express themselves freely without judgment.",
      icon: "👥"
    },
    {
      id: 4,
      title: "Easy to Use",
      description: "Simple, intuitive interface designed for everyone. Start expressing yourself in seconds.",
      icon: "⚡"
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why Choose SafeVoice?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A platform dedicated to protecting your right to anonymous expression
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transition duration-300 transform hover:-translate-y-2"
            >
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
