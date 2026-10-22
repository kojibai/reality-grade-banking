#!/usr/bin/env node
// Reference adapter for isolated public integration contracts, not live money.
import {referenceContractAdapter} from '../src/conformance/contract.ts';
let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>1024*1024)throw Error('ADAPTER_REQUEST_LIMIT');}
const request=JSON.parse(input);console.log(JSON.stringify(await referenceContractAdapter(request)));process.stdout.write('',()=>process.exit(0));
