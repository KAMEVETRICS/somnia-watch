const { ethers } = require('ethers');

(async () => {
  const p = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network');
  const bn = await p.getBlockNumber();
  console.log('Current block:', bn);
  
  let totalTxs = 0;
  for (let i = 0; i < 10; i++) {
    const b = await p.getBlock(bn - i, true);
    const txCount = b.prefetchedTransactions?.length || 0;
    totalTxs += txCount;
    if (txCount > 0) {
      console.log(`Block ${bn - i}: ${txCount} txs`);
      const tx = b.prefetchedTransactions[0];
      console.log(`  Sample: ${tx.from} -> ${tx.to} | ${ethers.formatEther(tx.value)} STT`);
    }
  }
  console.log(`Total txs in last 10 blocks: ${totalTxs}`);
})();
