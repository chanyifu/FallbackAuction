// 测试网演示清单，由 scripts/demo-testnet.js 自动生成，勿手改。
window.DEMO_MANIFEST_TESTNET = {
  "chainId": 10143,
  "rpc": "https://testnet-rpc.monad.xyz",
  "network": "Monad Testnet",
  "beneficiary": "0xe9B912085EC50c378Fb776bD697255133DA215f3",
  "accounts": [
    {
      "role": "受益人",
      "address": "0xe9B912085EC50c378Fb776bD697255133DA215f3"
    },
    {
      "role": "A",
      "address": "0x6392e7832D6DDef84326cC35715410e869209cF3"
    },
    {
      "role": "B",
      "address": "0xA716cdB0dA67F729Ab30D3Ae9805b592165CA727"
    },
    {
      "role": "C",
      "address": "0xd07a1c5d40f7C3525aD0D2E02A19D67A2497f618"
    }
  ],
  "auctions": [
    {
      "address": "0xe2e8ce3db727167be64ff990d2c1fed1f79c681f",
      "label": "场次 1",
      "scenario": "fallback",
      "title": "违约递补成交",
      "bidDeadline": 1795253861,
      "bids": [
        {
          "role": "A",
          "bidder": "0x6392e7832D6DDef84326cC35715410e869209cF3",
          "price": "0.20",
          "deposit": "0.020"
        },
        {
          "role": "B",
          "bidder": "0xA716cdB0dA67F729Ab30D3Ae9805b592165CA727",
          "price": "0.16",
          "deposit": "0.016"
        },
        {
          "role": "C",
          "bidder": "0xd07a1c5d40f7C3525aD0D2E02A19D67A2497f618",
          "price": "0.12",
          "deposit": "0.012"
        }
      ],
      "txs": {
        "deploy": "0x7633e9b972544c4a7900fdd8b69b9707347701377b3b31549d4929810c681fbb",
        "bidC": {
          "hash": "0x607e00cc0161fc8e50c041b15c01bd510a22385232b1e9fc228f57830af86a24",
          "block": 81542715,
          "status": null
        },
        "bidB": {
          "hash": "0x47d56714e22d227e7c066f9b948fdafdf65c93dd23881d1f847cb0d73db12991",
          "block": 81542720,
          "status": null
        },
        "bidA": {
          "hash": "0x3a37f41543bc99dfaaf0c85772ac018c97abb804c7b623f170f92447552988c2",
          "block": 81542726,
          "status": null
        },
        "settle": {
          "hash": "0xc2dcb86e637e9b639242f441aa993d58f79f1e6162cb32df44b0ff0456a9e15b",
          "block": 81543246,
          "status": null
        },
        "defaultA": {
          "hash": "0xf2e0703ebc81d80790efd8b9a30911ffd359b6b0aa602b1a1bc7c3c8850a99a0",
          "block": 81543309,
          "status": null
        },
        "payB": {
          "hash": "0xc1803f0a22703379c270146699bd2c3065a7a5621c287cd9de47feb47ff12a30",
          "block": 81543314,
          "status": null
        },
        "refundC": {
          "hash": "0xc3c0b458a433ab4baf1c0241563c27fb0ee62a8e1db30d17070c4f9a923adac7",
          "block": 81543316,
          "status": null
        },
        "withdraw": {
          "hash": "0xc15048554d1f7da2595c16b51e5dcf7313291705d1cc62f921efe8f6db63fc30",
          "block": 81543322,
          "status": null
        }
      }
    },
    {
      "address": "0xf90bceb8382ace988fa0621e918e14bc3b69fc4b",
      "label": "场次 2",
      "scenario": "fallback",
      "title": "违约递补成交",
      "bidDeadline": 1795253869,
      "bids": [
        {
          "role": "A",
          "bidder": "0x6392e7832D6DDef84326cC35715410e869209cF3",
          "price": "0.20",
          "deposit": "0.020"
        },
        {
          "role": "B",
          "bidder": "0xA716cdB0dA67F729Ab30D3Ae9805b592165CA727",
          "price": "0.16",
          "deposit": "0.016"
        },
        {
          "role": "C",
          "bidder": "0xd07a1c5d40f7C3525aD0D2E02A19D67A2497f618",
          "price": "0.12",
          "deposit": "0.012"
        }
      ],
      "txs": {
        "deploy": "0x6a24fb1761628e9346d3a080ce1a33f069735ff190b2db01b9d8373339c6f5f8",
        "bidC": {
          "hash": "0xe8fe34a2724968bd8606501d7293e0e662840e643a301d910ba7a18758dca2a3",
          "block": 81542738,
          "status": null
        },
        "bidB": {
          "hash": "0x41933228a3ea2d1944532253d6bb99af11237a08fcd438032f52a757528e73fb",
          "block": 81542741,
          "status": null
        },
        "bidA": {
          "hash": "0x1ef69068deefbcce3891ff4a9e543a890ca26ee61e939dbb118d893cb06baa51",
          "block": 81542747,
          "status": null
        },
        "settle": {
          "hash": "0x5bea836be4ae494b7ce5c7212238441de50b703a92f3a226d1647e434f5ab1ae",
          "block": 81543251,
          "status": null
        },
        "defaultA": {
          "hash": "0x96f93593feaf337d6d144ca1f24a854f306f89b29e0455de8fed042f99b67b90",
          "block": 81543333,
          "status": null
        },
        "payB": {
          "hash": "0xdeacb70425f9159aa775ee7cecd42c4819b3dba40f504fe484e16d9b24a3cd45",
          "block": 81543338,
          "status": null
        },
        "refundC": {
          "hash": "0xad28cfeded97dd0628f3c2c492f9d6167209b6b61bf025a253e2a1c53663ba8f",
          "block": 81543343,
          "status": null
        },
        "withdraw": {
          "hash": "0x102f33e73e12744a2131dd0af5b54e319bcd2adbfa66163fce20701285372e77",
          "block": 81543348,
          "status": null
        }
      }
    },
    {
      "address": "0x226433ced2fb9eda7e61424d448d8857c7be9e92",
      "label": "场次 3",
      "scenario": "fallback",
      "title": "违约递补成交",
      "bidDeadline": 1795253876,
      "bids": [
        {
          "role": "A",
          "bidder": "0x6392e7832D6DDef84326cC35715410e869209cF3",
          "price": "0.20",
          "deposit": "0.020"
        },
        {
          "role": "B",
          "bidder": "0xA716cdB0dA67F729Ab30D3Ae9805b592165CA727",
          "price": "0.16",
          "deposit": "0.016"
        },
        {
          "role": "C",
          "bidder": "0xd07a1c5d40f7C3525aD0D2E02A19D67A2497f618",
          "price": "0.12",
          "deposit": "0.012"
        }
      ],
      "txs": {
        "deploy": "0xb692876af0a58380e2231968487e2504cf14139ff1a04b00f462e100ab35cae7",
        "bidC": {
          "hash": "0x4e4becd582d29d2e8dca9e9904c17417a4ec86417bc9dba6f0516ad49195cc84",
          "block": 81542762,
          "status": null
        },
        "bidB": {
          "hash": "0x1f2443bb96e5180ed757104bd5f66db5e9a11ad80ab4e10f3937768bba58fc79",
          "block": 81542771,
          "status": null
        },
        "bidA": {
          "hash": "0x8521c349b7fb4fde11b925be146681ffd2cc55cd2e9051c9cdeef1f7de7c869d",
          "block": 81542781,
          "status": null
        },
        "settle": {
          "hash": "0x94a0d8142abf7c26dd61d32c93a62d98c6f4270312c78daf9b84f10210f79569",
          "block": 81543256,
          "status": null
        },
        "defaultA": {
          "hash": "0x19ca8dfffa8207e4f9f1f7d34cbfc85804dbdc7c5aee1532880bab8a1c780d6a",
          "block": 81543362,
          "status": null
        },
        "payB": {
          "hash": "0x85468d4b94c46bdf9cc20305f5141a44a646f73416f69f2275ffb8ddc6157683",
          "block": 81543366,
          "status": null
        },
        "refundC": {
          "hash": "0x9ff118ec54c48e56d20a7bce13382a58f49f4a98ba50dd7923af173fbf486eca",
          "block": 81543370,
          "status": null
        },
        "withdraw": {
          "hash": "0x4d63dae2d74ebac4f3c0687442a1237b81a87d5e5a14d1c9ce4d08266357c22d",
          "block": 81543375,
          "status": null
        }
      }
    },
    {
      "address": "0xbd07d0fe5e6b6f180ba141f315e5125e6193b422",
      "label": "场次 4",
      "scenario": "abort",
      "title": "双违约流拍退款",
      "bidDeadline": 1795253887,
      "bids": [
        {
          "role": "A",
          "bidder": "0x6392e7832D6DDef84326cC35715410e869209cF3",
          "price": "0.20",
          "deposit": "0.020"
        },
        {
          "role": "B",
          "bidder": "0xA716cdB0dA67F729Ab30D3Ae9805b592165CA727",
          "price": "0.16",
          "deposit": "0.016"
        },
        {
          "role": "C",
          "bidder": "0xd07a1c5d40f7C3525aD0D2E02A19D67A2497f618",
          "price": "0.12",
          "deposit": "0.012"
        }
      ],
      "txs": {
        "deploy": "0x6405c21a224736985977246402e1f22b32c9181e6d4f5ef6eb3d0ff12784b00a",
        "bidC": {
          "hash": "0x9e2054803a16ebe2895cfc92bd35bc7d2c96692873e8554d08990990726a73e3",
          "block": 81542798,
          "status": null
        },
        "bidB": {
          "hash": "0xd5344cb46b9fb376e4c7a1866d8c69840e0a6897a0b07a19e80910994de7f473",
          "block": 81542805,
          "status": null
        },
        "bidA": {
          "hash": "0x232b2c4b693a213beca6f9d5d40543cd8f46e82a1e2b6c15f35f9168f158fec5",
          "block": 81542816,
          "status": null
        },
        "settle": {
          "hash": "0x71db3acf69354bc68e2308931366c8b4d97eca5a6689aad16b35b69cfc932804",
          "block": 81543261,
          "status": null
        },
        "defaultA": {
          "hash": "0xecc097c8424489de88b88dbbd24f0a828f7e1d4888d54704933cee8cf2df3a91",
          "block": 81543395,
          "status": null
        },
        "defaultB": {
          "hash": "0x222a5b50bb24918c7b9fc9fe1e67393205e6d957bbc29bcfc85cc169964e48dc",
          "block": 81543458,
          "status": null
        },
        "declineC": {
          "hash": "0x6e0b927b839f2a3a3965418329f993856de95da25ebed435cb4bc03997f67785",
          "block": 81543464,
          "status": null
        },
        "withdraw": {
          "hash": "0x4697e145251c60b4b5c7c841e8a59b27704e616ac70e1c45e046fc3dee485ef8",
          "block": 81543468,
          "status": null
        }
      }
    },
    {
      "address": "0xbbbae379b62da16779f9f13c081e1a41e70ab4be",
      "label": "场次 5",
      "scenario": "abort",
      "title": "双违约流拍退款",
      "bidDeadline": 1795253897,
      "bids": [
        {
          "role": "A",
          "bidder": "0x6392e7832D6DDef84326cC35715410e869209cF3",
          "price": "0.20",
          "deposit": "0.020"
        },
        {
          "role": "B",
          "bidder": "0xA716cdB0dA67F729Ab30D3Ae9805b592165CA727",
          "price": "0.16",
          "deposit": "0.016"
        },
        {
          "role": "C",
          "bidder": "0xd07a1c5d40f7C3525aD0D2E02A19D67A2497f618",
          "price": "0.12",
          "deposit": "0.012"
        }
      ],
      "txs": {
        "deploy": "0x8dfdab4a8ae5208ec9724b8aff2bb5f818471c7fcb62e74f9a5eb0cdd914267d",
        "bidC": {
          "hash": "0xe8e4f58912556091359898bdd0cb1c46f163e7e0481aa8ab8610db6bad0918e9",
          "block": 81542835,
          "status": null
        },
        "bidB": {
          "hash": "0x8a15343ba50de60f8cd89e3840def1888bead8a65955d4d125d3211998551d37",
          "block": 81542839,
          "status": null
        },
        "bidA": {
          "hash": "0xcbdbcc2df0d538da7494b250dce4d1725c89693d08524bf00e587d784dbc898f",
          "block": 81542847,
          "status": null
        },
        "settle": {
          "hash": "0xc05403fef0a1ea4d527952f64350b0b6cc1da52227098639f1cca9fd56eb5554",
          "block": 81543265,
          "status": null
        },
        "defaultA": {
          "hash": "0x73379c07cc1bacf146f4615efd072adca7fe17e2b883e17509c47bc2f01c991f",
          "block": 81543480,
          "status": null
        },
        "defaultB": {
          "hash": "0xbd8dbb86961e2aca9f40a99c94b125ef8260a247994d8b7802a912ff6627c303",
          "block": 81543536,
          "status": null
        },
        "declineC": {
          "hash": "0x1ed258e4c18aae9f5e6b93e873c0a0e81641812178ec191be15d1a609192957d",
          "block": 81543540,
          "status": null
        },
        "withdraw": {
          "hash": "0x757a2d8b0e6b727542efaf7053b75c793dc8e81ae2cc9eff3087729609701c04",
          "block": 81543546,
          "status": null
        }
      }
    },
    {
      "address": "0xbd916ba6ddc64427a17d7d47468e971f9688e58b",
      "label": "场次 6",
      "scenario": "abort",
      "title": "双违约流拍退款",
      "bidDeadline": 1795253906,
      "bids": [
        {
          "role": "A",
          "bidder": "0x6392e7832D6DDef84326cC35715410e869209cF3",
          "price": "0.20",
          "deposit": "0.020"
        },
        {
          "role": "B",
          "bidder": "0xA716cdB0dA67F729Ab30D3Ae9805b592165CA727",
          "price": "0.16",
          "deposit": "0.016"
        },
        {
          "role": "C",
          "bidder": "0xd07a1c5d40f7C3525aD0D2E02A19D67A2497f618",
          "price": "0.12",
          "deposit": "0.012"
        }
      ],
      "txs": {
        "deploy": "0xee65abb341020c0e806f04c44d17a88b750a815df1af96897416083afc3a9f41",
        "bidC": {
          "hash": "0xec00f25eb57efff684de561aa7e073955c84eb2e8631ba3d26a07fb118bc0f7f",
          "block": 81542866,
          "status": null
        },
        "bidB": {
          "hash": "0x6b95bc38415107e7c52dc0ec296c06aa57b969679805f33c21708291a1ced395",
          "block": 81542869,
          "status": null
        },
        "bidA": {
          "hash": "0x8a5d1c5bdb5994e898a0ecbf074f10ba02b1b153f79633984021a74cede21a4d",
          "block": 81542873,
          "status": null
        },
        "settle": {
          "hash": "0x9b861bd0e532e69a3afbc0bc22f4cedaf9d3cfa31b8a78e035d3cfb6ea91832b",
          "block": 81543270,
          "status": null
        },
        "defaultA": {
          "hash": "0x7032cd4b9fa5a576705b14e4c55cd6a452c1a9f1efa7310df4013655074a0919",
          "block": 81543563,
          "status": null
        },
        "defaultB": {
          "hash": "0x357803683eebae00fe089d3aa7303dafd7d5713af3af7992c19c5a9dd1033f76",
          "block": 81543626,
          "status": null
        },
        "declineC": {
          "hash": "0x5173a939bd634a52c21dd75cb15e57230eddbfa1eb562745b75d6973ce94c4f7",
          "block": 81543632,
          "status": null
        },
        "withdraw": {
          "hash": "0x1ae9df09316056095e0bea232dadc5a1d0e31b88feccb56b6af73293f2d496f9",
          "block": 81543635,
          "status": null
        }
      }
    }
  ]
};
