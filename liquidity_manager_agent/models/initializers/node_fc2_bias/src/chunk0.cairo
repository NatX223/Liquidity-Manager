use orion::numbers::{FixedTrait, FP16x16};

fn compute(ref a: Array<FP16x16>) {
a.append(FP16x16 { mag: 52378, sign: false });
a.append(FP16x16 { mag: 10600, sign: false });
}