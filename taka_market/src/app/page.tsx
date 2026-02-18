import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-24">
      {/* Hero */}
      <section className="text-center pt-16 pb-8">
        <h1 className="text-5xl md:text-7xl font-bold mb-6">
          Run. Earn.{" "}
          <span className="text-green-400">Predict.</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
          Earn TK coins by running with the TAKA app, then use them to predict
          outcomes on real-world events. Powered by Monad blockchain.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/markets"
            className="bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-3 rounded-lg text-lg transition"
          >
            Browse Markets
          </Link>
          <Link
            href="/login"
            className="border border-gray-600 hover:border-gray-400 px-8 py-3 rounded-lg text-lg transition"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section>
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gray-900 rounded-xl p-8 text-center border border-gray-800">
            <div className="text-4xl mb-4">🏃</div>
            <h3 className="text-xl font-bold mb-2">1. Run & Earn</h3>
            <p className="text-gray-400">
              Download TAKA Run, track your runs with GPS, and earn TK coins for
              every kilometer.
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl p-8 text-center border border-gray-800">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-bold mb-2">2. Predict</h3>
            <p className="text-gray-400">
              Browse prediction markets on sports, politics, entertainment, and
              more. Bet YES or NO with your earned TK.
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl p-8 text-center border border-gray-800">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-bold mb-2">3. Win</h3>
            <p className="text-gray-400">
              If your prediction is correct, claim your share of the pool.
              Winnings are proportional to your bet.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: "Total Markets", value: "—" },
          { label: "Total Volume", value: "— TK" },
          { label: "Active Users", value: "—" },
          { label: "TK Distributed", value: "—" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-900 rounded-xl p-6 text-center border border-gray-800"
          >
            <div className="text-2xl font-bold text-green-400">{stat.value}</div>
            <div className="text-gray-400 text-sm mt-1">{stat.label}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
