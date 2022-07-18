import { HTTP } from '@awesome-cordova-plugins/http';
import axios from 'axios'

export default async function postAccounts(){
    const obj = {
        "jsonrpc": "2.0",
        "method": "eth_getBalance",
        params: ["0x36ba9Be3Df4925066250835eBf25Dc8BFb6287B1", "latest"],
        // id: 67
    }

    const headers = {
        "Content-Type": "application/json"
    }

    try{
        // const result: any = await axios.post("localhost:7545", JSON.stringify(obj), {
        //     headers
        // })

        const result = await fetch("https://eth-rinkeby.alchemyapi.io/v2/hIk0UVVxipbYRdAWJymmoLkc3OA-frjN", {
            method: 'POST',
            headers: new Headers({
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify({...obj})
        })

        //curl.exe https://eth-rinkeby.alchemyapi.io/v2/hIk0UVVxipbYRdAWJymmoLkc3OA-frjN -X POST -H "Content-Type: application/json" -d "{jsonrpc: 2.0, method: eth_accounts}"
        // const result = await HTTP.post("https://eth-rinkeby.alchemyapi.io/v2/hIk0UVVxipbYRdAWJymmoLkc3OA-frjN", obj, headers)
        // const result = await HTTP.post("http://127.0.0.1:7545", obj, headers)
        // const result = await HTTP.post("http://192.168.178.53:7545", obj, headers)

        // console.log(result)
    return await result.json()

    }catch(e){
        console.log(e);
    }

    

}