use orion::numbers::{FixedTrait, FP16x16};

fn compute(ref a: Array<FP16x16>) {
a.append(FP16x16 { mag: 23296, sign: false });
a.append(FP16x16 { mag: 30186, sign: false });
a.append(FP16x16 { mag: 13907, sign: false });
a.append(FP16x16 { mag: 21066, sign: false });
a.append(FP16x16 { mag: 903, sign: true });
a.append(FP16x16 { mag: 35249, sign: false });
}