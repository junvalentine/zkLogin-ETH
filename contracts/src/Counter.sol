// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract Groth16Verifier {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 20491192805390485299153009773594534940189261866228447918068658471970481763042;
    uint256 constant alphay  = 9383485363053290200918347156157836566562967994039712273449902621266178545958;
    uint256 constant betax1  = 4252822878758300859123897981450591353533073413197771768651442665752259397132;
    uint256 constant betax2  = 6375614351688725206403948262868962793625744043794305715222011528459656738731;
    uint256 constant betay1  = 21847035105528745403288232691147584728191162732299865338377159692350059136679;
    uint256 constant betay2  = 10505242626370262277552901082094356697409835680220590971873171140371331206856;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant deltax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant deltay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant deltay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;

    
    uint256 constant IC0x = 14624465672146144785036068447156601483298428256052138215796465355832815393573;
    uint256 constant IC0y = 5995501325629979323429805144709095697987923425175638010506884845566959403880;
    
    uint256 constant IC1x = 15118107332627769488625491200955106250047639375421184692773708452817077576871;
    uint256 constant IC1y = 14104415609365258570590039889784179314301974744070598544712536870565232258725;
    
    uint256 constant IC2x = 19481830362643584638863697916247900358957484470725369466100956169716210056463;
    uint256 constant IC2y = 13464021675448522831473297762624765007777133494262344240327098267346842745681;
    
    uint256 constant IC3x = 21491782944224054066666515665807227899918956231582054849410870351328925714177;
    uint256 constant IC3y = 12669563544753819491060789513380440286298813013277920455388706292194927936617;
    
    uint256 constant IC4x = 4261527035466896176064766645352701235436966273158429910236066445175681840854;
    uint256 constant IC4y = 3461913096480043766537587498148389579722201745504092915075491163275299846698;
    
    uint256 constant IC5x = 12079147393529733913873993467389678593399182207221063496681885312718232596061;
    uint256 constant IC5y = 5509250612448633531101239241740825448176319188363081168145753122879915443370;
    
    uint256 constant IC6x = 10454484197898929905311050705061520568868644041196784190465821060353595612211;
    uint256 constant IC6y = 5183694865996326796747667454430095905940217851623012359584928987396021722177;
    
    uint256 constant IC7x = 5874290364259263762573859935433320725725442307940448104129179206161919636085;
    uint256 constant IC7y = 6364346728684558704652376161220898726784664886053010758658821384091678532348;
    
    uint256 constant IC8x = 12769540275657355137660645273381190815549631452784756788112139456527981095279;
    uint256 constant IC8y = 11044167015122483609059704483631372418955720469227514631486758125850916285800;
    
    uint256 constant IC9x = 21205099062397329431586227861740980906955244947962543768244963790320731417260;
    uint256 constant IC9y = 13183348175492889110744126947266411868247301497154570229394839900929657107969;
    
    uint256 constant IC10x = 18420913095075875358701390700729294926360369471394792550374334309958461665631;
    uint256 constant IC10y = 11099363018149155968665677908922020663156462909003753136413892491321542672364;
    
    uint256 constant IC11x = 16103174675775779244439862386739963019578938304458723065429070483161486718185;
    uint256 constant IC11y = 6175850299270003507387198290963127817290771985031539301981887998055814243120;
    
    uint256 constant IC12x = 4775313047156966782649513495624564348882511145082215089413014335523804277233;
    uint256 constant IC12y = 16994516102607142846060561145692993130551072575320276802749510771014307731815;
    
    uint256 constant IC13x = 15316383879279606039378506685173532481083091955602701613299012259756189908744;
    uint256 constant IC13y = 3304324686671792075513739690320662676603387194848519109225065126491094630429;
    
    uint256 constant IC14x = 15679181954418361092787982468842233057762540633228278758083611798244888471355;
    uint256 constant IC14y = 17423831062418619996136553814907255750291654237117383920237981828769208699300;
    
    uint256 constant IC15x = 21408480091847689072443938610769170022462805884820694666216906378842090445980;
    uint256 constant IC15y = 18577422742752930762987205580340054143354393184969371085495012986983051573106;
    
    uint256 constant IC16x = 15580840350984370197820926875824642828429379937024691279191455300181893023371;
    uint256 constant IC16y = 18421954333051615087202012610225154372650384209798385896373791925299623296141;
    
    uint256 constant IC17x = 10202129923479563604605440508625189746437310571549619404742203289242824037411;
    uint256 constant IC17y = 3582473963123920452478753313150255292288812930850155446958047095161113456299;
    
    uint256 constant IC18x = 3235088324664966268379151472786122878652031726316623952768201067875451223415;
    uint256 constant IC18y = 3254518804093174240835694605537641978061487885564914138178220283748274552585;
    
    uint256 constant IC19x = 9115576595314115941687888655163975480347726754248281907621948558619114254367;
    uint256 constant IC19y = 12354294709023326933668511155674703972101918040974182298826104936541984722638;
    
    uint256 constant IC20x = 12870679382515600142146442584104083583773427461477901106693253336413587928787;
    uint256 constant IC20y = 15671061204910641606092205658493112036431588597736900003249030387243583130095;
    
    uint256 constant IC21x = 10109119393800325463716537000002678218468544375088461736525131228332415447929;
    uint256 constant IC21y = 8129562921039714724482381660959851230646330534391942675323377401037580564233;
    
    uint256 constant IC22x = 20056867508050600253603992828081920441807283989123901716732564383352217578375;
    uint256 constant IC22y = 10521913590859151545531008315423249191168172894496936800909299723103948776286;
    
    uint256 constant IC23x = 5137743403529323093666940267935533021561004052919404555581128775126968019266;
    uint256 constant IC23y = 20401584648112504925156320762811481015111511082251454195627648937706738071977;
    
    uint256 constant IC24x = 20173028776269900425932960947395952747492316972069921076049564426051319624595;
    uint256 constant IC24y = 2659656940586440324147333821889188529772422014263933069534135660054990029900;
    
    uint256 constant IC25x = 21698484602780345930094392146995685196404799149705231038831489979891456001137;
    uint256 constant IC25y = 18492093589464351862957848040609243463510215525597258530890668461513128676631;
    
    uint256 constant IC26x = 4370229973000025290386507949924348712490879286350804939562995955309033677566;
    uint256 constant IC26y = 17025579793739974926165626944245154734059281959448185848229342526359941129301;
    
    uint256 constant IC27x = 20550614141585472605358750322051915644677740854643219189066118808399915252938;
    uint256 constant IC27y = 11705638250388855885655010454959973745359609572819644453139225621518208603318;
    
    uint256 constant IC28x = 13548482353241718099296235427582406669361260512971785273164941447639438401432;
    uint256 constant IC28y = 8328887700878369747042024977892900915768170973872361777739661100689370732255;
    
    uint256 constant IC29x = 8145937833598560649120810508111369765962908393856195417791614958904389257044;
    uint256 constant IC29y = 18382228876215767145519196769430663192893967927938344989137778744246961376012;
    
    uint256 constant IC30x = 19370005605484072338253015940250597813943973703283637299744004076695143261750;
    uint256 constant IC30y = 14123801547018523301714207626348147163708843235658819349345003687955636874568;
    
    uint256 constant IC31x = 13490973411023041943527333642123890106333844849185551865112077836900538910623;
    uint256 constant IC31y = 2332472792481295134825985933954995350832654426388414880373895140217849489701;
    
    uint256 constant IC32x = 6213556631062905056080375780271605270451489565461021337378230457275511897235;
    uint256 constant IC32y = 7914704641318592479277970384072043057659365803168464014742216700635382974801;
    
    uint256 constant IC33x = 12184287408940189893422049903787973916760012065424709769400434573001780538328;
    uint256 constant IC33y = 10198887769314693738684529956875524542823382328900472467122949895337811715320;
    
    uint256 constant IC34x = 1421082071774264537553711085917603621349869733153170976778661694850406305358;
    uint256 constant IC34y = 15675851605672514004200385462093098449658442922300129556772942559867953705924;
    
    uint256 constant IC35x = 2094108146921619002585387347683422127214502327624421620592151830372454342597;
    uint256 constant IC35y = 7597673031206985023151317781802157245506627481710918514053090880627582086266;
    
    uint256 constant IC36x = 20458119575383390658603123363875100687010901140330917428375683189917736610418;
    uint256 constant IC36y = 5047656753226799546347002410063136477177223652197885101452759817493926332236;
    
    uint256 constant IC37x = 10235086042873555630001165903219882640330912891246487281065863289089458726566;
    uint256 constant IC37y = 15343011531981197712219171146218462212069637782501826416423556657837193786;
    
    uint256 constant IC38x = 18215429446436649385710125455378983466241543427020356382926556783696757403947;
    uint256 constant IC38y = 17677981870206953390780493398579781190335676576927720335182894443458650935397;
    
    uint256 constant IC39x = 4005208024273723663712536891569037557466155141043325054328872942892502514269;
    uint256 constant IC39y = 9640793904094642874713000894879504502410647132201022317082666146117894955228;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[39] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                
                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))
                
                g1_mulAccC(_pVk, IC6x, IC6y, calldataload(add(pubSignals, 160)))
                
                g1_mulAccC(_pVk, IC7x, IC7y, calldataload(add(pubSignals, 192)))
                
                g1_mulAccC(_pVk, IC8x, IC8y, calldataload(add(pubSignals, 224)))
                
                g1_mulAccC(_pVk, IC9x, IC9y, calldataload(add(pubSignals, 256)))
                
                g1_mulAccC(_pVk, IC10x, IC10y, calldataload(add(pubSignals, 288)))
                
                g1_mulAccC(_pVk, IC11x, IC11y, calldataload(add(pubSignals, 320)))
                
                g1_mulAccC(_pVk, IC12x, IC12y, calldataload(add(pubSignals, 352)))
                
                g1_mulAccC(_pVk, IC13x, IC13y, calldataload(add(pubSignals, 384)))
                
                g1_mulAccC(_pVk, IC14x, IC14y, calldataload(add(pubSignals, 416)))
                
                g1_mulAccC(_pVk, IC15x, IC15y, calldataload(add(pubSignals, 448)))
                
                g1_mulAccC(_pVk, IC16x, IC16y, calldataload(add(pubSignals, 480)))
                
                g1_mulAccC(_pVk, IC17x, IC17y, calldataload(add(pubSignals, 512)))
                
                g1_mulAccC(_pVk, IC18x, IC18y, calldataload(add(pubSignals, 544)))
                
                g1_mulAccC(_pVk, IC19x, IC19y, calldataload(add(pubSignals, 576)))
                
                g1_mulAccC(_pVk, IC20x, IC20y, calldataload(add(pubSignals, 608)))
                
                g1_mulAccC(_pVk, IC21x, IC21y, calldataload(add(pubSignals, 640)))
                
                g1_mulAccC(_pVk, IC22x, IC22y, calldataload(add(pubSignals, 672)))
                
                g1_mulAccC(_pVk, IC23x, IC23y, calldataload(add(pubSignals, 704)))
                
                g1_mulAccC(_pVk, IC24x, IC24y, calldataload(add(pubSignals, 736)))
                
                g1_mulAccC(_pVk, IC25x, IC25y, calldataload(add(pubSignals, 768)))
                
                g1_mulAccC(_pVk, IC26x, IC26y, calldataload(add(pubSignals, 800)))
                
                g1_mulAccC(_pVk, IC27x, IC27y, calldataload(add(pubSignals, 832)))
                
                g1_mulAccC(_pVk, IC28x, IC28y, calldataload(add(pubSignals, 864)))
                
                g1_mulAccC(_pVk, IC29x, IC29y, calldataload(add(pubSignals, 896)))
                
                g1_mulAccC(_pVk, IC30x, IC30y, calldataload(add(pubSignals, 928)))
                
                g1_mulAccC(_pVk, IC31x, IC31y, calldataload(add(pubSignals, 960)))
                
                g1_mulAccC(_pVk, IC32x, IC32y, calldataload(add(pubSignals, 992)))
                
                g1_mulAccC(_pVk, IC33x, IC33y, calldataload(add(pubSignals, 1024)))
                
                g1_mulAccC(_pVk, IC34x, IC34y, calldataload(add(pubSignals, 1056)))
                
                g1_mulAccC(_pVk, IC35x, IC35y, calldataload(add(pubSignals, 1088)))
                
                g1_mulAccC(_pVk, IC36x, IC36y, calldataload(add(pubSignals, 1120)))
                
                g1_mulAccC(_pVk, IC37x, IC37y, calldataload(add(pubSignals, 1152)))
                
                g1_mulAccC(_pVk, IC38x, IC38y, calldataload(add(pubSignals, 1184)))
                
                g1_mulAccC(_pVk, IC39x, IC39y, calldataload(add(pubSignals, 1216)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            
            checkField(calldataload(add(_pubSignals, 32)))
            
            checkField(calldataload(add(_pubSignals, 64)))
            
            checkField(calldataload(add(_pubSignals, 96)))
            
            checkField(calldataload(add(_pubSignals, 128)))
            
            checkField(calldataload(add(_pubSignals, 160)))
            
            checkField(calldataload(add(_pubSignals, 192)))
            
            checkField(calldataload(add(_pubSignals, 224)))
            
            checkField(calldataload(add(_pubSignals, 256)))
            
            checkField(calldataload(add(_pubSignals, 288)))
            
            checkField(calldataload(add(_pubSignals, 320)))
            
            checkField(calldataload(add(_pubSignals, 352)))
            
            checkField(calldataload(add(_pubSignals, 384)))
            
            checkField(calldataload(add(_pubSignals, 416)))
            
            checkField(calldataload(add(_pubSignals, 448)))
            
            checkField(calldataload(add(_pubSignals, 480)))
            
            checkField(calldataload(add(_pubSignals, 512)))
            
            checkField(calldataload(add(_pubSignals, 544)))
            
            checkField(calldataload(add(_pubSignals, 576)))
            
            checkField(calldataload(add(_pubSignals, 608)))
            
            checkField(calldataload(add(_pubSignals, 640)))
            
            checkField(calldataload(add(_pubSignals, 672)))
            
            checkField(calldataload(add(_pubSignals, 704)))
            
            checkField(calldataload(add(_pubSignals, 736)))
            
            checkField(calldataload(add(_pubSignals, 768)))
            
            checkField(calldataload(add(_pubSignals, 800)))
            
            checkField(calldataload(add(_pubSignals, 832)))
            
            checkField(calldataload(add(_pubSignals, 864)))
            
            checkField(calldataload(add(_pubSignals, 896)))
            
            checkField(calldataload(add(_pubSignals, 928)))
            
            checkField(calldataload(add(_pubSignals, 960)))
            
            checkField(calldataload(add(_pubSignals, 992)))
            
            checkField(calldataload(add(_pubSignals, 1024)))
            
            checkField(calldataload(add(_pubSignals, 1056)))
            
            checkField(calldataload(add(_pubSignals, 1088)))
            
            checkField(calldataload(add(_pubSignals, 1120)))
            
            checkField(calldataload(add(_pubSignals, 1152)))
            
            checkField(calldataload(add(_pubSignals, 1184)))
            
            checkField(calldataload(add(_pubSignals, 1216)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
            return(0, 0x20)
         }
     }
 }
