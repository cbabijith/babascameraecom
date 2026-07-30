import Image from 'next/image'

export default function PromotionalCards() {
  return (
    <section className="pt-12">
      <div className="constrained-width">
        <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: "24px" }}>
          <div className="rounded-[24px] overflow-hidden">
            <Image
              src="/home/pro1.svg"
              alt="100% Safe & Secure Payments"
              width={400}
              height={300}
              className="w-full h-full"
            />
          </div>

          <div className="rounded-[24px] overflow-hidden">
            <Image 
              src="/home/pro2.svg" 
              alt="Why Choose Us" 
              width={400}
              height={300}
              className="w-full h-full "
            />
          </div>

          <div className="rounded-[24px] overflow-hidden">
            <Image
              src="/home/pro3.svg"
              alt="Everything You Need, All In One Place"
              width={400}
              height={300}
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    </section>
  )
}