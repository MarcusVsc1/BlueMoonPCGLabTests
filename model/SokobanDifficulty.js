/** Avaliação computacional experimental. Não representa dificuldade humana calibrada. */
class SokobanDifficulty {
    static defaultCalibration() {
        return {weights:{extraLines:.23,alternation:.15,relaxedGap:.20,nonDecreasing:.15,
            searchEffort:.12,deadlockPruning:.05,greedyFailure:.10},thresholds:[20,40,60,80],
            trivialCap:19,greedySolvedCap:59}
    }
    static calibration(overrides={}) {
        const base=this.defaultCalibration(), weights={...base.weights,...overrides.weights}
        const thresholds=overrides.thresholds??base.thresholds
        const trivialCap=overrides.trivialCap??base.trivialCap,greedySolvedCap=overrides.greedySolvedCap??base.greedySolvedCap
        if(Object.keys(weights).some(k=>!(k in base.weights))||Object.values(weights).some(w=>!Number.isFinite(w)||w<0)||
            !Object.values(weights).some(w=>w>0)) throw new Error('Pesos de dificuldade inválidos')
        if(!Array.isArray(thresholds)||thresholds.length!==4||thresholds.some((t,i)=>!Number.isFinite(t)||t<=0||t>=100||(i>0&&t<=thresholds[i-1]))) throw new Error('Limiares inválidos')
        if([trivialCap,greedySolvedCap].some(t=>!Number.isFinite(t)||t<0||t>100)) throw new Error('Limites de pontuação inválidos')
        return {weights,thresholds,trivialCap,greedySolvedCap}
    }
    static solutionMetrics(solver, pushes) {
        const ids=new Map(solver.boxes.map((b,i)=>[b,i])), perBox=new Map()
        let boxLines=0, boxChanges=0, nonDecreasing=0, previous=null
        for(const p of pushes) {
            const id=ids.get(p.from); ids.delete(p.from); ids.set(p.to,id)
            if(!previous||previous.id!==id||previous.direction!==p.direction) {
                boxLines++; perBox.set(id,(perBox.get(id)||0)+1)
            }
            if(previous&&previous.id!==id) boxChanges++
            if(p.hAfter>=p.hBefore) nonDecreasing++
            previous={id,direction:p.direction}
        }
        return {pushes:pushes.length,boxLines,boxChanges,nonDecreasing,
            movedBoxes:perBox.size,maxLinesPerBox:Math.max(0,...perBox.values())}
    }
    static analyze(state,{maxExpanded=4000,greedyMaxExpanded=200,deadline=Infinity,calibration={}}={}) {
        const config=this.calibration(calibration)
        let solver
        try {solver=SokobanSolver.fromState(state)} catch(e) {return {status:'invalid',reason:e.message}}
        if(solver.boxes.length<2||solver.solved(solver.boxes)) return {status:'invalid',reason:'Menos de duas caixas ou já resolvido'}
        const exact=solver.solve({maxExpanded,deadline})
        if(exact.status!=='solved') return {status:exact.status,expanded:exact.expanded,solver:exact}
        const replay=solver.replay(exact.pushes)
        if(!replay.valid) return {status:'invalid',reason:'Replay independente falhou'}
        const metrics=this.solutionMetrics(solver,exact.pushes)
        const greedy=solver.solve({maxExpanded:greedyMaxExpanded,deadline,greedy:true})
        const greedyMetrics=greedy.status==='solved'?this.solutionMetrics(solver,greedy.pushes):null
        // Certifica a existência de uma solução direta; não infere trivialidade de um timeout.
        const direct=m=>m&&m.maxLinesPerBox<=1&&m.nonDecreasing===0
        const trivial=!!(direct(metrics)||direct(greedyMetrics))
        const excess=Math.max(0,metrics.pushes-exact.initialLowerBound)
        const extraLines=Math.max(0,metrics.boxLines-metrics.movedBoxes)
        const clamp=x=>Math.max(0,Math.min(1,x))
        const n=solver.boxes.length
        const components={
            extraLines:clamp(extraLines/(2*n)),
            alternation:clamp(Math.max(0,metrics.boxChanges-(metrics.movedBoxes-1))/(2*n)),
            relaxedGap:clamp(excess/(3*n)),
            nonDecreasing:clamp(metrics.nonDecreasing/(2*n)),
            searchEffort:clamp(Math.log2(1+exact.expanded/Math.max(1,metrics.pushes))/6),
            deadlockPruning:clamp(exact.deadlockPrunes/Math.max(1,exact.legalPushes)),
            greedyFailure:greedy.status==='greedy_failed'?1:0
        }
        const weightSum=Object.values(config.weights).reduce((a,b)=>a+b,0)
        let score=100*Object.keys(config.weights).reduce((sum,k)=>sum+config.weights[k]*components[k],0)/weightSum
        if(trivial) score=Math.min(score,config.trivialCap)
        else if(greedy.status==='solved') score=Math.min(score,config.greedySolvedCap)
        const level=1+config.thresholds.filter(t=>score>=t).length
        return {status:'solved',optimal:true,score,level,label:['Fácil','Normal','Difícil','Muito difícil','Especialista'][level-1],
            trivial,boxes:n,metrics:{...metrics,relaxedLowerBound:exact.initialLowerBound,relaxedGap:excess,
                expanded:exact.expanded,legalPushes:exact.legalPushes,deadlockPrunes:exact.deadlockPrunes,
                greedyStatus:greedy.status,greedyExpanded:greedy.expanded,playerSteps:replay.steps.length},
            components,solution:exact.pushes,playerMoves:replay.steps}
    }
    /** Seleção final fora dos rollouts, com limites separados e mesmo fluxo para benchmark e jogo. */
    static generate(game,state,options={}) {
        const {deadline=Infinity,totalMoves=1000,maxAttempts=20,restartEvery=10,candidateLimit=20,
            maxCandidatesPerBatch=8,maxExpanded=4000,greedyMaxExpanded=200,solverReserveMs=250,
            targetDifficulty=null,rejectTrivial=false,minBoxes=2,calibration={}}=options
        if(targetDifficulty!==null&&(!Number.isInteger(targetDifficulty)||targetDifficulty<1||targetDifficulty>5)) throw new Error('targetDifficulty deve ser null ou 1..5')
        this.calibration(calibration)
        let mcts=new MonteCarlo(game,2,{minBoxes,candidateLimit}), attempts=0, checked=0, generated=0
        const evaluated=new Map(), counts={solved:0,invalid:0,unsolvable:0,limit:0,timeout:0,trivial:0,rejectedDifficulty:0}
        let best=null
        const compare=(a,b)=> {
            if(targetDifficulty!==null) {
                const diff=Math.abs(a.analysis.level-targetDifficulty)-Math.abs(b.analysis.level-targetDifficulty)
                if(diff) return diff
            }
            return Number(a.analysis.trivial)-Number(b.analysis.trivial)||b.analysis.score-a.analysis.score||b.state.score-a.state.score
        }
        for(let attempt=0;attempt<maxAttempts&&Date.now()<deadline;attempt++) {
            attempts++
            const searchDeadline=Number.isFinite(deadline)?deadline-Math.max(0,solverReserveMs):Infinity
            if(Date.now()>=searchDeadline) break
            mcts.runSearch(state,totalMoves,searchDeadline)
            const candidates=mcts.getCandidates(); generated+=candidates.filter(c=>!evaluated.has(MonteCarlo.candidateKey(c))).length
            let tried=0
            for(const candidate of candidates) {
                if(tried>=maxCandidatesPerBatch||Date.now()>=deadline) break
                const key=MonteCarlo.candidateKey(candidate)
                if(evaluated.has(key)) continue
                tried++;checked++
                // Divide o tempo restante para que um candidato difícil não monopolize o lote.
                const remaining=Math.min(maxCandidatesPerBatch-tried+1,candidates.length)
                const candidateDeadline=Number.isFinite(deadline)?Math.min(deadline,Date.now()+Math.max(1,Math.floor((deadline-Date.now())/remaining))):Infinity
                const analysis=this.analyze(candidate,{maxExpanded,greedyMaxExpanded,deadline:candidateDeadline,calibration})
                if(analysis.status!=='timeout') evaluated.set(key,analysis.status)
                counts[analysis.status]=(counts[analysis.status]||0)+1
                if(analysis.status!=='solved') continue
                if(analysis.trivial) counts.trivial++
                if(rejectTrivial&&analysis.trivial) continue
                if(targetDifficulty!==null&&analysis.level!==targetDifficulty) {counts.rejectedDifficulty++;continue}
                const choice={state:candidate,analysis}
                if(!best||compare(choice,best)<0) best=choice
            }
            // Mantém a política: primeiro lote com candidato aceitável.
            if(best) break
            if(restartEvery>0&&(attempt+1)%restartEvery===0) mcts=new MonteCarlo(game,2,{minBoxes,candidateLimit})
        }
        return {winner:best?.state??null,analysis:best?.analysis??null,stats:{attempts,checked,generatedPoolObservations:generated,counts}}
    }
}
