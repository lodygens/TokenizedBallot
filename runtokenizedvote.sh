#!/bin/sh

CHAIRCONF=".env.bootcamp"
VOTER1CONF=".env.bootcamp1"
VOTER2CONF=".env.bootcamp2"
VOTER3CONF=".env.bootcamp3"

PURPOSES="one two three"

CHAIRADDR="0xbd0C50CCd017Df7A1AaA3658C3D6309E85464F5B"
VOTER1ADDR="0x6392c3f68BD1dED8BE5C8654494d81472ab53d9a"
VOTER2ADDR="0xB646946b98CB7F662852458A4e39B0439d6Dd815"
VOTER3ADDR="0xD7Da6dFF289814EEB7EC9b5c11844D1E011216e6"

LOGFILE="runall.log"

echo "Deploy"
ln -sf .env.bootcamp .env
yarn run ts-node --files scripts/deployment.ts deploy one two three 2>&1 > ${LOGFILE}
TOGREP="deployed at"
grep "${TOGREP}" ${LOGFILE} || (echo "ERROR : Deploy" ; exit 1)
CONTRACTADDR=`cat ${LOGFILE} | grep "${TOGREP}" | cut -d ' ' -f 3`
echo "Ballot contract address : ${CONTRACTADDR}"

# Give right to vote to Voter1
ln -sf .env.bootcamp .env
yarn run ts-node --files scripts/deployment.ts giveRightToVote ${CONTRACTADDR} ${VOTER1ADDR} 2>&1 > ${LOGFILE}
TOGREP="giveRightToVote Tx hash"
VOTER="Voter1"
grep "${TOGREP}" ${LOGFILE} || $(echo "ERROR : Give right to vote to ${VOTER}" ; exit 1)
TXHASH=`cat ${LOGFILE} | grep "${TOGREP}" | cut -d ' ' -f 4`
echo "Give right to vote to ${VOTER} Tx hash = ${TXHASH}"

# Give right to vote to Voter2
ln -sf .env.bootcamp .env
yarn run ts-node --files scripts/deployment.ts giveRightToVote ${CONTRACTADDR} ${VOTER2ADDR} 2>&1 > ${LOGFILE}
TOGREP="giveRightToVote Tx hash"
VOTER="Voter2"
grep "${TOGREP}" ${LOGFILE} || $(echo "ERROR : Give right to vote to ${VOTER}" ; exit 1)
TXHASH=`cat ${LOGFILE} | grep "${TOGREP}" | cut -d ' ' -f 4`
echo "Give right to vote to ${VOTER} Tx hash = ${TXHASH}"

# Give right to vote to Voter3
ln -sf .env.bootcamp .env
yarn run ts-node --files scripts/deployment.ts giveRightToVote ${CONTRACTADDR} ${VOTER3ADDR} 2>&1 > ${LOGFILE}
TOGREP="giveRightToVote Tx hash"
VOTER="Voter3"
grep "${TOGREP}" ${LOGFILE} || $(echo "ERROR : Give right to vote to ${VOTER}" ; exit 1)
TXHASH=`cat ${LOGFILE} | grep "${TOGREP}" | cut -d ' ' -f 4`
echo "Give right to vote to ${VOTER} Tx hash = ${TXHASH}"

# Voter1 delegates to Voter2
ln -sf .env.bootcamp1 .env
yarn run ts-node --files scripts/deployment.ts delegate ${CONTRACTADDR} ${VOTER2ADDR} 2>&1 > ${LOGFILE}
TOGREP="Delegate Tx hash"
grep "${TOGREP}" ${LOGFILE} || $(echo "ERROR : Voter1 delegates to Voter2Give" ; exit 1)
TXHASH=`cat ${LOGFILE} | grep "${TOGREP}" | cut -d ' ' -f 4`
echo "Voter1 delegates to Voter2 Tx hash = ${TXHASH}"

# Voter3 votes 'three'
ln -sf .env.bootcamp3 .env
yarn run ts-node --files scripts/deployment.ts  vote ${CONTRACTADDR} 2 2>&1 > ${LOGFILE}
TOGREP="Vote Tx hash"
grep "${TOGREP}" ${LOGFILE} || $(echo "ERROR : Voter3 votes 'three'" ; exit 1)
TXHASH=`cat ${LOGFILE} | grep "${TOGREP}" | cut -d ' ' -f 4`
echo "Voter3 votes 'three' Tx hash = ${TXHASH}"

# Show proposals
echo "Proposals : "
ln -sf .env.bootcamp3 .env
yarn run ts-node --files scripts/deployment.ts  proposals ${CONTRACTADDR}

# Voter2 votes 'two'
ln -sf .env.bootcamp2 .env
yarn run ts-node --files scripts/deployment.ts  vote ${CONTRACTADDR} 1 2>&1 > ${LOGFILE}
TOGREP="Vote Tx hash"
grep "${TOGREP}" ${LOGFILE} || $(echo "ERROR : Voter3 votes 'three'" ; exit 1)
TXHASH=`cat ${LOGFILE} | grep "${TOGREP}" | cut -d ' ' -f 4`
echo "Voter2 votes 'two' Tx hash = ${TXHASH}"

# Show proposals
echo "Proposals : "
ln -sf .env.bootcamp2 .env
yarn run ts-node --files scripts/deployment.ts  proposals ${CONTRACTADDR}
